/**
 * sender.js — メール自動送信
 * email_queue/ の queued メールを古い順に送信。
 * Nodemailer + Gmail SMTP。2分間隔、1日50通上限。
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('./config');

const TODAY = new Date().toISOString().slice(0, 10);

// Count today's sends from log
function getTodaySendCount() {
  if (!fs.existsSync(config.SEND_LOG)) return 0;
  const lines = fs.readFileSync(config.SEND_LOG, 'utf-8').split('\n');
  return lines.filter(l => l.includes(TODAY) && l.includes('sent')).length;
}

// Append to send log
function logSend(email, shopName, status, error) {
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(config.SEND_LOG)) {
    fs.writeFileSync(config.SEND_LOG, '日時,店名,メール,ステータス,エラー\n');
  }
  const row = `${timestamp},${shopName},${email},${status},${error || ''}\n`;
  fs.appendFileSync(config.SEND_LOG, row);
}

// Update target_list.csv send date
function updateTargetCSV(shopName, field, value) {
  if (!fs.existsSync(config.TARGET_CSV)) return;
  let content = fs.readFileSync(config.TARGET_CSV, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const fieldIdx = headers.findIndex(h => h.trim() === field);
  const statusIdx = headers.findIndex(h => h.trim() === 'ステータス');

  if (fieldIdx === -1) return;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0] && cols[0].trim().replace(/"/g, '') === shopName) {
      cols[fieldIdx] = value;
      if (field === '送信日' && statusIdx !== -1) {
        cols[statusIdx] = '送信済み';
      }
      lines[i] = cols.join(',');
      break;
    }
  }
  fs.writeFileSync(config.TARGET_CSV, lines.join('\n'));
}

async function run(options = {}) {
  const dryRun = options.dryRun || false;
  console.log(`\n=== Sender — ${TODAY} ${dryRun ? '(DRY RUN)' : ''} ===`);

  // Check SMTP config
  if (!dryRun && !config.SMTP_PASS) {
    console.log('  [ERROR] SMTP_PASS not set in .env. Cannot send.');
    return 0;
  }

  // Create transporter
  let transporter = null;
  if (!dryRun) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });

    // Verify connection
    try {
      await transporter.verify();
      console.log('  SMTP connection verified.');
    } catch (err) {
      console.log(`  [ERROR] SMTP verify failed: ${err.message}`);
      return 0;
    }
  }

  // Load queued emails
  if (!fs.existsSync(config.EMAIL_QUEUE)) {
    console.log('  No email queue directory.');
    return 0;
  }

  const files = fs.readdirSync(config.EMAIL_QUEUE)
    .filter(f => f.endsWith('.json'))
    .sort(); // alphabetical = chronological with date prefix

  const queued = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(config.EMAIL_QUEUE, f), 'utf-8'));
      if (data.status === 'queued') {
        queued.push({ file: f, data });
      }
    } catch (e) {}
  }

  console.log(`  Queued emails: ${queued.length}`);

  let todaySent = getTodaySendCount();
  let sent = 0;
  let consecutiveFailures = 0;

  for (const item of queued) {
    // Daily limit check
    if (todaySent >= config.DAILY_SEND_LIMIT) {
      console.log(`  Daily limit reached (${config.DAILY_SEND_LIMIT}). Stopping.`);
      break;
    }

    // Consecutive failure check
    if (consecutiveFailures >= config.MAX_CONSECUTIVE_FAILURES) {
      console.log(`  [ALERT] ${config.MAX_CONSECUTIVE_FAILURES} consecutive failures. Pipeline stopped.`);
      logSend('', '', 'PIPELINE_STOPPED', `${config.MAX_CONSECUTIVE_FAILURES} consecutive failures`);
      break;
    }

    const { file, data } = item;
    const filePath = path.join(config.EMAIL_QUEUE, file);

    if (dryRun) {
      console.log(`  [DRY] Would send to: ${data.to} — ${data.subject}`);
      sent++;
      todaySent++;
      continue;
    }

    // Send email
    try {
      await transporter.sendMail({
        from: `"HNH Design Works" <${config.SMTP_USER}>`,
        to: data.to,
        subject: data.subject,
        text: data.body
      });

      // Update queue file
      data.status = 'sent';
      data.sent_at = new Date().toISOString();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      // Update target CSV
      updateTargetCSV(data.shop_name, '送信日', TODAY);

      // Log
      logSend(data.to, data.shop_name, 'sent', '');
      console.log(`  [SENT] ${data.shop_name} → ${data.to}`);

      sent++;
      todaySent++;
      consecutiveFailures = 0;

      // Wait between sends
      if (todaySent < config.DAILY_SEND_LIMIT && queued.indexOf(item) < queued.length - 1) {
        console.log(`  Waiting ${config.SEND_INTERVAL_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, config.SEND_INTERVAL_MS));
      }

    } catch (err) {
      data.status = 'failed';
      data.error = err.message;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logSend(data.to, data.shop_name, 'failed', err.message);
      console.log(`  [FAIL] ${data.shop_name}: ${err.message}`);
      consecutiveFailures++;
    }
  }

  console.log(`  Sent today: ${sent} (total today: ${todaySent})`);
  return sent;
}

module.exports = { run };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  run({ dryRun }).catch(console.error);
}
