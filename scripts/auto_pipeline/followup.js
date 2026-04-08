/**
 * followup.js — 自動フォローアップ
 * 送信済み＆返信なし＆7日経過のリードにフォローアップメールを作成。
 * フォローアップは1回のみ。
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date();

// Parse CSV
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => obj[h.trim()] = (vals[idx] || '').trim().replace(/^"|"$/g, ''));
    rows.push(obj);
  }
  return rows;
}

// Load unsubscribe list
function loadUnsubscribed() {
  const emails = new Set();
  if (!fs.existsSync(config.UNSUBSCRIBE_LIST)) return emails;
  const lines = fs.readFileSync(config.UNSUBSCRIBE_LIST, 'utf-8').split('\n');
  for (const line of lines) {
    const email = line.trim();
    if (email && !email.startsWith('email')) emails.add(email.toLowerCase());
  }
  return emails;
}

// Check if already followed up (check queue for followup type)
function getFollowedUpShops() {
  const names = new Set();
  if (!fs.existsSync(config.EMAIL_QUEUE)) return names;
  const files = fs.readdirSync(config.EMAIL_QUEUE).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(config.EMAIL_QUEUE, f), 'utf-8'));
      if (data.type === 'followup') names.add(data.shop_name);
    } catch (e) {}
  }
  return names;
}

// Build followup email
function buildFollowup(lead) {
  const shopName = lead['店名'] || '御社';

  const subject = `Re: 【ご提案】${shopName}様のホームページ制作についてご案内`;

  const body = `${shopName}
ご担当者様

先日ご連絡させていただいたHNH Design Worksの${config.OWNER_NAME}です。
お忙しいところ恐れ入ります。

先日のご提案について、もしご不明な点やご質問がございましたらお気軽にお聞きください。

「今すぐは考えていないが、いずれ検討したい」という場合でも、いつでもご連絡をお待ちしております。

HNH Design Works
${config.OWNER_NAME}
${config.SMTP_USER}

※今後のご案内が不要な場合は、その旨ご返信いただければ即時配信を停止いたします。`;

  return { subject, body };
}

// Update status in CSV
function updateStatus(shopName, newStatus) {
  if (!fs.existsSync(config.TARGET_CSV)) return;
  const content = fs.readFileSync(config.TARGET_CSV, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const statusIdx = headers.findIndex(h => h.trim() === 'ステータス');
  if (statusIdx === -1) return;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0] && cols[0].trim().replace(/"/g, '') === shopName) {
      cols[statusIdx] = newStatus;
      lines[i] = cols.join(',');
      break;
    }
  }
  fs.writeFileSync(config.TARGET_CSV, lines.join('\n'));
}

async function run(options = {}) {
  console.log(`\n=== Followup — ${TODAY} ===`);

  const leads = parseCSV(config.TARGET_CSV);
  const unsubscribed = loadUnsubscribed();
  const followedUp = getFollowedUpShops();
  let created = 0;

  for (const lead of leads) {
    const shopName = lead['店名'];
    const email = lead['メールアドレス'];
    const status = lead['ステータス'] || '';
    const sendDate = lead['送信日'] || '';
    const replyDate = lead['返信日'] || '';

    // Only process: sent, no reply, not already followed up
    if (!email || !shopName) continue;
    if (status !== '送信済み') continue;
    if (replyDate) continue;
    if (followedUp.has(shopName)) continue;
    if (unsubscribed.has(email.toLowerCase())) continue;

    // Check if enough days have passed
    if (!sendDate) continue;
    const sentAt = new Date(sendDate);
    const daysSince = Math.floor((NOW - sentAt) / 86400000);
    if (daysSince < config.FOLLOWUP_DAYS) continue;

    // Build followup email
    const { subject, body } = buildFollowup(lead);
    const timestamp = new Date().toISOString();
    const filename = `followup_${TODAY}_${shopName.replace(/[\/\\?%*:|"<>\s]/g, '_')}.json`;

    const emailData = {
      to: email,
      subject,
      body,
      shop_name: shopName,
      category: lead['業種'] || '',
      area: lead['エリア'] || '',
      created_at: timestamp,
      status: 'queued',
      type: 'followup'
    };

    fs.writeFileSync(
      path.join(config.EMAIL_QUEUE, filename),
      JSON.stringify(emailData, null, 2),
      'utf-8'
    );

    // Update CSV status
    updateStatus(shopName, 'フォローアップ予定');
    created++;
  }

  console.log(`  Followup emails created: ${created}`);
  return created;
}

module.exports = { run };

if (require.main === module) {
  run().catch(console.error);
}
