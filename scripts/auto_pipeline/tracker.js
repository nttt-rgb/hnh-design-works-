/**
 * tracker.js — ダッシュボード自動更新
 * target_list.csv と send_log.csv を集計し dashboard.md を生成。
 */
const fs = require('fs');
const config = require('./config');

const TODAY = new Date().toISOString().slice(0, 10);

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

async function run(options = {}) {
  console.log(`\n=== Tracker — ${TODAY} ===`);

  const leads = parseCSV(config.TARGET_CSV);
  const logs = parseCSV(config.SEND_LOG);

  // Stats
  const total = leads.length;
  const withEmail = leads.filter(l => l['メールアドレス']).length;
  const withPhone = leads.filter(l => l['電話番号']).length;
  const sent = leads.filter(l => ['送信済み', 'フォローアップ予定', 'フォローアップ済み'].includes(l['ステータス'])).length;
  const replied = leads.filter(l => l['返信日']).length;
  const unsent = leads.filter(l => !l['ステータス'] || l['ステータス'] === '未送信').length;
  const followupPending = leads.filter(l => {
    if (l['ステータス'] !== '送信済み' || !l['送信日'] || l['返信日']) return false;
    const days = Math.floor((new Date() - new Date(l['送信日'])) / 86400000);
    return days >= config.FOLLOWUP_DAYS;
  }).length;

  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0.0';

  // By area
  const byArea = {};
  for (const l of leads) {
    const a = l['エリア'] || '不明';
    if (!byArea[a]) byArea[a] = { total: 0, sent: 0, replied: 0 };
    byArea[a].total++;
    if (l['送信日']) byArea[a].sent++;
    if (l['返信日']) byArea[a].replied++;
  }

  // By category
  const byCat = {};
  for (const l of leads) {
    const c = l['業種'] || '不明';
    if (!byCat[c]) byCat[c] = { total: 0, sent: 0, replied: 0 };
    byCat[c].total++;
    if (l['送信日']) byCat[c].sent++;
    if (l['返信日']) byCat[c].replied++;
  }

  // Today's log
  const todaySent = logs.filter(l => l['日時'] && l['日時'].startsWith(TODAY) && l['ステータス'] === 'sent').length;
  const todayFailed = logs.filter(l => l['日時'] && l['日時'].startsWith(TODAY) && l['ステータス'] === 'failed').length;

  // Queue count
  let queueCount = 0;
  if (fs.existsSync(config.EMAIL_QUEUE)) {
    const files = fs.readdirSync(config.EMAIL_QUEUE).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(`${config.EMAIL_QUEUE}/${f}`, 'utf-8'));
        if (d.status === 'queued') queueCount++;
      } catch (e) {}
    }
  }

  // Build markdown
  let md = `# 営業パイプライン ダッシュボード\n\n`;
  md += `**最終更新:** ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n\n`;
  md += `---\n\n`;
  md += `## KPI\n\n`;
  md += `| 指標 | 数値 |\n|------|------|\n`;
  md += `| 総リード数 | ${total} |\n`;
  md += `| メールアドレスあり | ${withEmail} |\n`;
  md += `| 電話番号あり | ${withPhone} |\n`;
  md += `| メール送信済み | ${sent} |\n`;
  md += `| 返信あり | ${replied} |\n`;
  md += `| 返信率 | ${replyRate}% |\n`;
  md += `| 未送信 | ${unsent} |\n`;
  md += `| 送信キュー待ち | ${queueCount} |\n`;
  md += `| フォローアップ対象 | ${followupPending} |\n\n`;

  md += `## 本日の実績 (${TODAY})\n\n`;
  md += `| 指標 | 数値 |\n|------|------|\n`;
  md += `| 送信成功 | ${todaySent} |\n`;
  md += `| 送信失敗 | ${todayFailed} |\n`;
  md += `| 残り送信枠 | ${Math.max(0, config.DAILY_SEND_LIMIT - todaySent)} |\n\n`;

  md += `## エリア別\n\n`;
  md += `| エリア | リード数 | 送信済み | 返信 |\n|--------|---------|---------|------|\n`;
  const sortedAreas = Object.entries(byArea).sort((a, b) => b[1].total - a[1].total);
  for (const [area, stats] of sortedAreas) {
    md += `| ${area} | ${stats.total} | ${stats.sent} | ${stats.replied} |\n`;
  }
  md += `\n`;

  md += `## 業種別\n\n`;
  md += `| 業種 | リード数 | 送信済み | 返信 |\n|------|---------|---------|------|\n`;
  const sortedCats = Object.entries(byCat).sort((a, b) => b[1].total - a[1].total);
  for (const [cat, stats] of sortedCats) {
    md += `| ${cat} | ${stats.total} | ${stats.sent} | ${stats.replied} |\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `*自動生成 by HNH Design Works Pipeline*\n`;

  fs.writeFileSync(config.DASHBOARD, md);
  console.log(`  Dashboard updated: ${config.DASHBOARD}`);

  // Print summary to console
  console.log(`  Total: ${total} | Sent: ${sent} | Replied: ${replied} | Rate: ${replyRate}%`);
  return { total, sent, replied, replyRate };
}

module.exports = { run };

if (require.main === module) {
  run().catch(console.error);
}
