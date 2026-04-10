/**
 * safety.js — 全スクリプト共通のAPI安全管理モジュール
 *
 * 機能:
 * - 日次リクエストカウンター（日付が変わったら自動リセット）
 * - 80% 警告、上限到達で自動停止
 * - 月間APIコスト一元管理（全APIの総額を追跡）
 * - 月間総コストが上限（$200）を超えたら停止
 * - ALLOW_PAID フラグで有料APIの明示的許可管理
 *
 * 使用例:
 *   const safety = require('./safety');
 *
 *   // 日次制限チェック
 *   const check = safety.checkDailyLimit('houjin_api_usage.json', 100);
 *   if (!check.ok) { console.error(check.error); process.exit(1); }
 *   if (check.warn) console.warn(check.warn);
 *
 *   // リクエスト実行後にカウンター増加
 *   safety.incrementDaily('houjin_api_usage.json');
 *
 *   // 月間コストチェック
 *   const cost = safety.checkMonthlyCostCap(0.005);
 *   if (!cost.ok) { console.error(cost.error); process.exit(1); }
 *   safety.recordCost('google_custom_search', 0.005);
 *
 *   // 有料API許可チェック
 *   if (!safety.allowPaid()) { console.error('ALLOW_PAID=true が必要'); process.exit(1); }
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '../../logs');
const MONTHLY_COSTS_FILE = 'monthly_api_costs.json';
const MONTHLY_CAP_USD = 200; // 全API月間上限 $200
const WARN_THRESHOLD = 0.8;  // 80%で警告
const CAP_WARN_THRESHOLD = 0.9; // 月コスト90%で警告

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

function loadUsage(filename) {
  const filepath = path.join(LOGS_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveUsage(filename, data) {
  ensureLogsDir();
  fs.writeFileSync(path.join(LOGS_DIR, filename), JSON.stringify(data, null, 2));
}

/**
 * 日次上限チェック。日付が変わっていれば自動リセット。
 * 上限到達時は { ok: false, error }, 80%超で { ok: true, warn }
 */
function checkDailyLimit(filename, limit) {
  const usage = loadUsage(filename);
  const today = todayISO();

  if (usage.date !== today) {
    // 新しい日にリセット
    const reset = { date: today, count: 0 };
    saveUsage(filename, reset);
    return { ok: true, count: 0, remaining: limit };
  }

  const count = usage.count || 0;
  const remaining = limit - count;

  if (count >= limit) {
    return {
      ok: false,
      count,
      remaining: 0,
      error: `[SAFETY] 日次上限に達しました: ${count}/${limit} (${filename})。明日までリクエストできません。`,
    };
  }

  let warn;
  if (count >= limit * WARN_THRESHOLD) {
    warn = `[WARN] 日次上限の${Math.floor((count / limit) * 100)}%に達しています: ${count}/${limit} (${filename})`;
  }

  return { ok: true, count, remaining, warn };
}

/**
 * 日次カウンターを1インクリメント。呼び出し前にcheckDailyLimitで確認すること。
 */
function incrementDaily(filename) {
  const usage = loadUsage(filename);
  const today = todayISO();
  if (usage.date !== today) {
    saveUsage(filename, { date: today, count: 1 });
    return 1;
  }
  usage.count = (usage.count || 0) + 1;
  saveUsage(filename, usage);
  return usage.count;
}

/**
 * 月間API総コスト管理。月が変わると自動リセット。
 */
function loadMonthlyCosts() {
  const usage = loadUsage(MONTHLY_COSTS_FILE);
  const month = monthISO();
  if (usage.month !== month) {
    return { month, total_usd: 0, by_api: {} };
  }
  return {
    month: usage.month,
    total_usd: usage.total_usd || 0,
    by_api: usage.by_api || {},
  };
}

/**
 * 有料APIリクエスト前に月間総コスト上限をチェック。
 * additionalCost を加算した時点で上限超過なら拒否。
 */
function checkMonthlyCostCap(additionalCost = 0) {
  const data = loadMonthlyCosts();
  const projected = data.total_usd + additionalCost;

  if (projected >= MONTHLY_CAP_USD) {
    return {
      ok: false,
      total: data.total_usd,
      cap: MONTHLY_CAP_USD,
      error: `[SAFETY] 月間APIコスト上限に達しました: $${data.total_usd.toFixed(2)} / $${MONTHLY_CAP_USD}。全ての有料API停止。`,
    };
  }

  let warn;
  if (projected >= MONTHLY_CAP_USD * CAP_WARN_THRESHOLD) {
    warn = `[WARN] 月間APIコストが上限の${Math.floor((projected / MONTHLY_CAP_USD) * 100)}%に達しています: $${projected.toFixed(2)} / $${MONTHLY_CAP_USD}`;
  }

  return { ok: true, total: data.total_usd, cap: MONTHLY_CAP_USD, warn };
}

/**
 * API コストを記録。checkMonthlyCostCap で許可された後に呼ぶ。
 */
function recordCost(apiName, costUsd) {
  const data = loadMonthlyCosts();
  data.total_usd = parseFloat((data.total_usd + costUsd).toFixed(4));
  data.by_api[apiName] = parseFloat(((data.by_api[apiName] || 0) + costUsd).toFixed(4));
  saveUsage(MONTHLY_COSTS_FILE, data);
  return data;
}

/**
 * .env の ALLOW_PAID=true が明示的に設定されているか。
 * デフォルトは false（安全側）。
 */
function allowPaid() {
  return (process.env.ALLOW_PAID || '').toLowerCase() === 'true';
}

/**
 * sleep ユーティリティ（レート制限用）
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  LOGS_DIR,
  MONTHLY_CAP_USD,
  loadUsage,
  saveUsage,
  checkDailyLimit,
  incrementDaily,
  loadMonthlyCosts,
  checkMonthlyCostCap,
  recordCost,
  allowPaid,
  sleep,
  todayISO,
  monthISO,
};
