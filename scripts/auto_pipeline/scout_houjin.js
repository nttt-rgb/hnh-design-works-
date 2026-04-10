/**
 * scout_houjin.js — 国税庁法人番号APIから東京の新設法人を取得し、
 * HP無し企業をリード候補としてCSV追記する。
 *
 * 実行フロー:
 *   1. 法人番号API（無料）で東京都の直近3ヶ月の新設法人を取得
 *   2. 各法人をGoogle検索でHP有無をチェック（有料・ALLOW_PAID=true時のみ）
 *      ALLOW_PAID=false時は HP未確認 として pending_houjin_leads.csv に保存
 *   3. HP無しと確認された法人は target_list.csv に追記（source=houjin_api）
 *
 * セーフティ:
 *   - 法人番号APIリクエスト上限: 1日100件
 *   - Google検索リクエスト上限: 1日50件
 *   - 月間総APIコスト上限: $200（全API合算）
 *   - ALLOW_PAID=false がデフォルト（課金が発生するAPIは明示的許可必要）
 *   - Google検索の最小間隔: 5秒
 *
 * 事前準備:
 *   - 国税庁法人番号API App ID を申請（無料、2週間〜1ヶ月）
 *     https://www.houjin-bangou.nta.go.jp/webapi/
 *   - ~/Desktop/.env に HOUJIN_API_APP_ID=xxx を追加
 *   - (オプション) Google Custom Search API Key + CX を申請して
 *     GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX を .env に追加
 *     ALLOW_PAID=true に設定
 *
 * 代替フロー (App ID待ちの間):
 *   - 月次CSVを手動ダウンロード: https://www.houjin-bangou.nta.go.jp/download/
 *   - --csv <path> オプションでCSVファイルを指定して実行可能
 *
 * 使い方:
 *   node scout_houjin.js                     # API モード（デフォルト、直近3ヶ月）
 *   node scout_houjin.js --days 30           # 直近30日
 *   node scout_houjin.js --csv houjin.csv    # 手動CSVモード
 *   node scout_houjin.js --dry-run           # 実APIコールせず件数のみ表示
 *   node scout_houjin.js --verify-hp         # Google検索でHP有無をチェック（ALLOW_PAID=true必須）
 */

require('dotenv').config({ path: require('path').join(require('os').homedir(), 'Desktop/.env') });
const fs = require('fs');
const path = require('path');
const https = require('https');
const safety = require('./safety');
const config = require('./config');

// ============================================================
// 設定
// ============================================================
const HOUJIN_API_APP_ID = process.env.HOUJIN_API_APP_ID || '';
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || '';

const HOUJIN_DAILY_LIMIT = 100;             // 法人番号API日次上限
const HOUJIN_USAGE_FILE = 'houjin_api_usage.json';

const GOOGLE_SEARCH_DAILY_LIMIT = 50;       // Google検索日次上限
const GOOGLE_SEARCH_USAGE_FILE = 'google_search_usage.json';
const GOOGLE_SEARCH_COST_PER_REQ = 0.005;   // $5/1000 queries
const GOOGLE_SEARCH_MIN_INTERVAL_MS = 5000; // 最小5秒間隔

const TOKYO_PREFECTURE_CODE = '13';
const HOUJIN_API_VERSION = '4';

const PENDING_CSV = path.join(config.ROOT, 'campaigns/direct_outreach/pending_houjin_leads.csv');
const PENDING_HEADERS = '法人番号,商号,所在地,設立日,法人種別,ステータス,HP確認日,HP結果,備考\n';

// ============================================================
// CLI 引数パース
// ============================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    mode: 'api',
    days: 90,
    csvPath: null,
    dryRun: false,
    verifyHp: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv' && args[i + 1]) { parsed.mode = 'csv'; parsed.csvPath = args[++i]; }
    else if (a === '--days' && args[i + 1]) { parsed.days = parseInt(args[++i], 10); }
    else if (a === '--dry-run') { parsed.dryRun = true; }
    else if (a === '--verify-hp') { parsed.verifyHp = true; }
  }
  return parsed;
}

// ============================================================
// 法人番号API
// ============================================================
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({ statusCode: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

async function fetchHoujinDiff(fromDate, toDate, divide = 1) {
  // 日次制限チェック
  const check = safety.checkDailyLimit(HOUJIN_USAGE_FILE, HOUJIN_DAILY_LIMIT);
  if (!check.ok) {
    throw new Error(check.error);
  }
  if (check.warn) console.warn(check.warn);

  if (!HOUJIN_API_APP_ID) {
    throw new Error(
      '[ERROR] HOUJIN_API_APP_ID が .env に設定されていません。\n' +
      '申請先: https://www.houjin-bangou.nta.go.jp/webapi/\n' +
      '申請無料ですが発行まで2週間〜1ヶ月かかります。\n' +
      '代替案: --csv <path> で月次CSVを手動入力するか、\n' +
      '        https://www.houjin-bangou.nta.go.jp/download/ からCSVダウンロード'
    );
  }

  const url = `https://api.houjin-bangou.nta.go.jp/${HOUJIN_API_VERSION}/diff?id=${HOUJIN_API_APP_ID}&from=${fromDate}&to=${toDate}&address=${TOKYO_PREFECTURE_CODE}&kind=01&type=02&divide=${divide}`;

  console.log(`[FETCH] Houjin API: ${fromDate} → ${toDate} (divide=${divide})`);
  const res = await fetchUrl(url);
  safety.incrementDaily(HOUJIN_USAGE_FILE);

  if (res.statusCode !== 200) {
    throw new Error(`法人番号API エラー ${res.statusCode}: ${res.body.slice(0, 500)}`);
  }
  return res.body;
}

// ============================================================
// CSV パース (法人番号API type=02 レスポンス形式)
// 列: シーケンス番号, 法人番号, 処理区分, 訂正区分, 更新年月日,
//     変更年月日, 商号, 商号イメージID, 種類, 名称英語,
//     郵便番号, 所在地, 所在地英語, 電話番号, 設立年月日, ...
// ============================================================
function parseHoujinCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const records = [];
  for (const line of lines) {
    // 簡易CSVパース（ダブルクォート対応）
    const fields = [];
    let field = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { field += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (c === ',' && !inQuote) {
        fields.push(field);
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field);

    if (fields.length < 12) continue;
    records.push({
      sequence: fields[0],
      houjinNumber: fields[1],
      processType: fields[2],
      corrected: fields[3],
      updatedDate: fields[4],
      changedDate: fields[5],
      name: fields[6],
      kind: fields[8],
      zipCode: fields[10] || '',
      address: fields[11] || '',
      // 設立年月日や電話番号は仕様により列位置が異なるので省略
    });
  }
  return records;
}

// ============================================================
// Google Custom Search でHP有無をチェック（有料・ゲート付き）
// ============================================================
let lastGoogleSearchTime = 0;

async function verifyHpViaGoogleSearch(companyName) {
  // ALLOW_PAIDチェック
  if (!safety.allowPaid()) {
    return { verified: false, reason: 'ALLOW_PAID=false のためHP確認をスキップ', hasHp: null };
  }

  // 月間コストチェック
  const costCheck = safety.checkMonthlyCostCap(GOOGLE_SEARCH_COST_PER_REQ);
  if (!costCheck.ok) {
    throw new Error(costCheck.error);
  }
  if (costCheck.warn) console.warn(costCheck.warn);

  // 日次制限チェック
  const rateCheck = safety.checkDailyLimit(GOOGLE_SEARCH_USAGE_FILE, GOOGLE_SEARCH_DAILY_LIMIT);
  if (!rateCheck.ok) {
    throw new Error(rateCheck.error);
  }
  if (rateCheck.warn) console.warn(rateCheck.warn);

  // APIキー確認
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
    throw new Error('GOOGLE_SEARCH_API_KEY または GOOGLE_SEARCH_CX が .env に設定されていません');
  }

  // レート制限: 前回から最小5秒
  const elapsed = Date.now() - lastGoogleSearchTime;
  if (elapsed < GOOGLE_SEARCH_MIN_INTERVAL_MS) {
    await safety.sleep(GOOGLE_SEARCH_MIN_INTERVAL_MS - elapsed);
  }

  const query = encodeURIComponent(`"${companyName}" 公式サイト`);
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${query}&num=5`;

  const res = await fetchUrl(url);
  lastGoogleSearchTime = Date.now();
  safety.incrementDaily(GOOGLE_SEARCH_USAGE_FILE);
  safety.recordCost('google_custom_search', GOOGLE_SEARCH_COST_PER_REQ);

  if (res.statusCode !== 200) {
    return { verified: false, reason: `Google API ${res.statusCode}`, hasHp: null };
  }

  try {
    const data = JSON.parse(res.body);
    const results = data.items || [];
    // 企業名を含む公式サイトっぽいドメインがあるかチェック
    const hasOfficialSite = results.some((item) => {
      const link = (item.link || '').toLowerCase();
      return (
        !link.includes('wantedly.com') &&
        !link.includes('indeed.com') &&
        !link.includes('linkedin.com') &&
        !link.includes('houjin-bangou') &&
        !link.includes('facebook.com') &&
        !link.includes('instagram.com') &&
        !link.includes('twitter.com') &&
        !link.includes('x.com/')
      );
    });
    return { verified: true, hasHp: hasOfficialSite };
  } catch (err) {
    return { verified: false, reason: `JSON parse error: ${err.message}`, hasHp: null };
  }
}

// ============================================================
// CSV 出力
// ============================================================
function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function ensurePendingCsv() {
  if (!fs.existsSync(PENDING_CSV)) {
    fs.writeFileSync(PENDING_CSV, PENDING_HEADERS);
  }
}

function appendPending(record) {
  ensurePendingCsv();
  const row = [
    record.houjinNumber,
    record.name,
    record.address,
    record.updatedDate,
    record.kind,
    'HP未確認',
    '',
    '',
    record.note || '',
  ].map(escapeCsv).join(',') + '\n';
  fs.appendFileSync(PENDING_CSV, row);
}

function loadExistingHoujinNumbers() {
  const numbers = new Set();
  if (!fs.existsSync(PENDING_CSV)) return numbers;
  const lines = fs.readFileSync(PENDING_CSV, 'utf-8').split('\n').slice(1);
  for (const line of lines) {
    const num = line.split(',')[0].trim();
    if (num) numbers.add(num);
  }
  return numbers;
}

// 既存の target_list.csv に追加（HP無しが確認できたリードのみ）
function appendToTargetCsv(record) {
  const row = [
    record.name,
    '法人（要カテゴリ分類）',
    record.address,
    '',          // email - 後で手動取得
    '',          // phone
    '',          // rating
    '',          // reviews
    'なし',
    '',          // instagram
    `法人番号API取得(${record.houjinNumber})・${record.updatedDate}更新`,
    '未送信',
    '',
    '',
  ].map(escapeCsv).join(',') + '\n';
  fs.appendFileSync(config.TARGET_CSV, row);
}

// ============================================================
// Main
// ============================================================
async function main() {
  const args = parseArgs();

  console.log('='.repeat(60));
  console.log('scout_houjin.js — 法人番号リード発掘');
  console.log(`Mode: ${args.mode} | Dry-run: ${args.dryRun} | Verify HP: ${args.verifyHp}`);
  console.log(`ALLOW_PAID: ${safety.allowPaid()}`);
  console.log('='.repeat(60));

  // 月間コスト現状表示
  const monthlyCosts = safety.loadMonthlyCosts();
  console.log(`月間総コスト: $${monthlyCosts.total_usd.toFixed(2)} / $${safety.MONTHLY_CAP_USD}`);
  if (Object.keys(monthlyCosts.by_api).length > 0) {
    console.log('  内訳:', monthlyCosts.by_api);
  }

  // 月間コスト上限の事前チェック（verify-hp時のみ）
  if (args.verifyHp && safety.allowPaid()) {
    const costCheck = safety.checkMonthlyCostCap(0);
    if (!costCheck.ok) {
      console.error(costCheck.error);
      process.exit(1);
    }
  } else if (args.verifyHp && !safety.allowPaid()) {
    console.warn('[WARN] --verify-hp 指定ですが ALLOW_PAID=false なので HP確認はスキップされます');
  }

  let records = [];

  if (args.mode === 'csv') {
    // CSVモード: 手動ダウンロードしたCSVを読む
    if (!args.csvPath || !fs.existsSync(args.csvPath)) {
      console.error(`[ERROR] CSVファイルが見つかりません: ${args.csvPath}`);
      process.exit(1);
    }
    const csvText = fs.readFileSync(args.csvPath, 'utf-8');
    records = parseHoujinCsv(csvText);
    console.log(`[CSV] ${records.length}件のレコードを読み込みました`);
  } else {
    // APIモード
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - args.days);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = today.toISOString().slice(0, 10);

    if (args.dryRun) {
      console.log(`[DRY-RUN] Would fetch ${fromStr} → ${toStr}, Tokyo(13), kind=株式会社`);
      console.log(`Current houjin API usage: ${safety.loadUsage(HOUJIN_USAGE_FILE).count || 0}/${HOUJIN_DAILY_LIMIT}`);
      return;
    }

    try {
      const csvBody = await fetchHoujinDiff(fromStr, toStr);
      records = parseHoujinCsv(csvBody);
      console.log(`[API] ${records.length}件のレコードを取得しました`);
    } catch (err) {
      console.error(`[ERROR] ${err.message}`);
      process.exit(1);
    }
  }

  // 重複除外
  const existing = loadExistingHoujinNumbers();
  const newRecords = records.filter((r) => !existing.has(r.houjinNumber));
  console.log(`[DEDUP] ${records.length}件 → 新規 ${newRecords.length}件`);

  // pending_houjin_leads.csv に追加
  let verifiedHpLessCount = 0;
  let pendingCount = 0;

  for (const record of newRecords) {
    if (args.verifyHp && safety.allowPaid()) {
      try {
        const result = await verifyHpViaGoogleSearch(record.name);
        if (result.verified && result.hasHp === false) {
          // HP無しと確認 → target_list.csv に追加
          appendToTargetCsv(record);
          verifiedHpLessCount++;
          console.log(`  ✓ HP無し確認: ${record.name}`);
        } else if (result.verified && result.hasHp === true) {
          console.log(`  - HP有り (skip): ${record.name}`);
        } else {
          // 確認失敗 → pending へ
          appendPending(record);
          pendingCount++;
          console.log(`  ? ${result.reason}: ${record.name}`);
        }
      } catch (err) {
        console.error(`[STOP] ${err.message}`);
        break; // セーフティで停止
      }
    } else {
      // HP確認なし → 全件 pending_houjin_leads.csv に保存
      appendPending(record);
      pendingCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`完了:`);
  console.log(`  pending_houjin_leads.csv に追加: ${pendingCount}件`);
  console.log(`  target_list.csv に追加 (HP無し確認済み): ${verifiedHpLessCount}件`);
  console.log(`  法人番号API日次使用: ${safety.loadUsage(HOUJIN_USAGE_FILE).count}/${HOUJIN_DAILY_LIMIT}`);
  if (args.verifyHp && safety.allowPaid()) {
    console.log(`  Google検索日次使用: ${safety.loadUsage(GOOGLE_SEARCH_USAGE_FILE).count}/${GOOGLE_SEARCH_DAILY_LIMIT}`);
    const updatedCosts = safety.loadMonthlyCosts();
    console.log(`  月間総コスト: $${updatedCosts.total_usd.toFixed(2)} / $${safety.MONTHLY_CAP_USD}`);
  }
  console.log('='.repeat(60));
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { parseHoujinCsv, verifyHpViaGoogleSearch };
