/**
 * scout_websearch.js — Web検索ベースのリード発掘スクリプト
 *
 * Places API枠が残り少ないとき、またはAPI不要で小ロットのリード発掘をしたいときに使用する。
 * 実際のWeb検索は Claude Code 側で実行し、結果をこのスクリプトに渡して CSV に追記する。
 *
 * 使い方:
 *   node scout_websearch.js <leads.json>
 *
 * leads.json 形式:
 * [
 *   {
 *     "name": "株式会社サンプル",
 *     "category": "IT企業",
 *     "area": "渋谷",
 *     "email": "",
 *     "phone": "03-1234-5678",
 *     "rating": "",
 *     "reviews": "",
 *     "hp_status": "なし",
 *     "instagram": "https://www.instagram.com/sample/",
 *     "note": "Web検索で発見。従業員10名未満推定",
 *     "status": "未送信",
 *     "source": "websearch"
 *   },
 *   ...
 * ]
 *
 * - HP確認済みで「なし」または「古い（スマホ非対応等）」のもののみ追記
 * - 重複チェック: target_list.csv に既に同名の店舗がある場合はスキップ
 * - CSV の列順: 店名,業種,エリア,メールアドレス,電話番号,Google評価,レビュー数,HP有無,Instagram,備考,ステータス,送信日,返信日
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const TARGET_CSV = config.TARGET_CSV;

function loadExistingNames() {
  const names = new Set();
  if (!fs.existsSync(TARGET_CSV)) return names;
  const content = fs.readFileSync(TARGET_CSV, 'utf-8');
  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0]) names.add(cols[0].trim());
  }
  return names;
}

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function leadToCsvRow(lead) {
  return [
    lead.name || '',
    lead.category || '',
    lead.area || '',
    lead.email || '',
    lead.phone || '',
    lead.rating || '',
    lead.reviews || '',
    lead.hp_status || '',
    lead.instagram || '',
    lead.note || '',
    lead.status || '未送信',
    lead.send_date || '',
    lead.reply_date || '',
  ].map(escapeCsv).join(',');
}

function main() {
  const leadsFile = process.argv[2];
  if (!leadsFile) {
    console.error('Usage: node scout_websearch.js <leads.json>');
    process.exit(1);
  }

  const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
  if (!Array.isArray(leads)) {
    console.error('leads.json must be an array');
    process.exit(1);
  }

  const existing = loadExistingNames();
  const newLeads = leads.filter((lead) => {
    if (!lead.name) return false;
    if (existing.has(lead.name.trim())) {
      console.log(`SKIP (duplicate): ${lead.name}`);
      return false;
    }
    if (lead.hp_status && lead.hp_status.includes('あり') && !lead.hp_status.includes('古い')) {
      console.log(`SKIP (HP有り): ${lead.name}`);
      return false;
    }
    return true;
  });

  if (newLeads.length === 0) {
    console.log('No new leads to add.');
    return;
  }

  const csvLines = newLeads.map(leadToCsvRow);

  // Append with proper newline handling
  let prefix = '';
  if (fs.existsSync(TARGET_CSV)) {
    const content = fs.readFileSync(TARGET_CSV, 'utf-8');
    if (content.length > 0 && !content.endsWith('\n')) {
      prefix = '\n';
    }
  }

  fs.appendFileSync(TARGET_CSV, prefix + csvLines.join('\n') + '\n');

  console.log(`Added ${newLeads.length} new leads from web search.`);
  console.log('Sources:', [...new Set(newLeads.map((l) => l.source || 'unknown'))]);
  console.log('Categories:', [...new Set(newLeads.map((l) => l.category || 'unknown'))]);
}

if (require.main === module) {
  main();
}

module.exports = { leadToCsvRow, loadExistingNames };
