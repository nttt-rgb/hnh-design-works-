#!/usr/bin/env node
/**
 * pipeline.js — 完全自動営業パイプライン オーケストレーション
 *
 * 使い方:
 *   node pipeline.js              全ステップ実行（送信含む）
 *   node pipeline.js --dry-run    全ステップ実行（送信はスキップ）
 *   node pipeline.js --scout-only リード発見のみ
 *   node pipeline.js --send-only  送信のみ
 *   node pipeline.js --stats      ダッシュボードのみ
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const scout = require('./scout');
const composer = require('./composer');
const sender = require('./sender');
const followup = require('./followup');
const tracker = require('./tracker');

const args = process.argv.slice(2);
const FLAGS = {
  dryRun: args.includes('--dry-run'),
  scoutOnly: args.includes('--scout-only'),
  sendOnly: args.includes('--send-only'),
  stats: args.includes('--stats'),
};

// Ensure directories exist
function ensureDirs() {
  const dirs = [
    path.dirname(config.TARGET_CSV),
    config.EMAIL_QUEUE,
    path.dirname(config.LOG_FILE),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// Logging
function log(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(config.LOG_FILE, line + '\n');
  } catch (e) {}
}

async function main() {
  const startTime = Date.now();
  log('========================================');
  log(`Pipeline started ${FLAGS.dryRun ? '(DRY RUN)' : ''}`);
  log('========================================');

  ensureDirs();

  try {
    // --stats: ダッシュボードのみ
    if (FLAGS.stats) {
      await tracker.run();
      return;
    }

    // --send-only: 送信のみ
    if (FLAGS.sendOnly) {
      const sent = await sender.run({ dryRun: FLAGS.dryRun });
      log(`Sender completed: ${sent} emails`);
      await tracker.run();
      return;
    }

    // --scout-only: リード発見のみ
    if (FLAGS.scoutOnly) {
      const newLeads = await scout.run();
      log(`Scout completed: ${newLeads} new leads`);
      await tracker.run();
      return;
    }

    // フルパイプライン
    // Step 1: Scout — 新規リード発見
    log('--- Step 1: Scout ---');
    const newLeads = await scout.run();
    log(`Scout completed: ${newLeads} new leads`);

    // Step 2: Composer — メール自動作成
    log('--- Step 2: Composer ---');
    const composed = await composer.run();
    log(`Composer completed: ${composed} emails queued`);

    // Step 3: Sender — メール送信
    log('--- Step 3: Sender ---');
    const sent = await sender.run({ dryRun: FLAGS.dryRun });
    log(`Sender completed: ${sent} emails sent`);

    // Step 4: Followup — フォローアップ
    log('--- Step 4: Followup ---');
    const followups = await followup.run();
    log(`Followup completed: ${followups} followup emails created`);

    // Step 5: Tracker — ダッシュボード更新
    log('--- Step 5: Tracker ---');
    await tracker.run();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log('========================================');
    log(`Pipeline completed in ${elapsed}s`);
    log(`  New leads: ${newLeads}`);
    log(`  Emails composed: ${composed}`);
    log(`  Emails sent: ${sent}`);
    log(`  Followups: ${followups}`);
    log('========================================');

  } catch (err) {
    log(`[FATAL] Pipeline error: ${err.message}`);
    log(err.stack);
    process.exit(1);
  }
}

main();
