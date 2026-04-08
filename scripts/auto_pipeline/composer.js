/**
 * composer.js — メール自動作成
 * target_list.csv から未送信リードを取得し、
 * カスタマイズされたメールを email_queue/ にJSON保存。
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const TODAY = new Date().toISOString().slice(0, 10);

// Parse CSV (simple parser for our known format)
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

// Get already queued shop names to avoid double-queuing
function getQueuedShops() {
  const names = new Set();
  if (!fs.existsSync(config.EMAIL_QUEUE)) return names;
  const files = fs.readdirSync(config.EMAIL_QUEUE).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(config.EMAIL_QUEUE, f), 'utf-8'));
      if (data.shop_name) names.add(data.shop_name);
    } catch (e) {}
  }
  return names;
}

// Build email body
function buildEmail(lead) {
  const shopName = lead['店名'] || '御社';
  const area = lead['エリア'] || '東京';
  const category = lead['業種'] || '店舗';
  const pitchLine = config.PITCH_LINES[category] || 'お店の魅力を、プロフェッショナルなデザインでWebに届けます。';

  const subject = `【ご提案】${shopName}様のホームページ制作についてご案内`;

  const body = `${shopName}
ご担当者様

突然のご連絡失礼いたします。
東京で店舗ビジネス向けのWeb制作を行っておりますHNH Design Worksの${config.OWNER_NAME}と申します。

Googleマップで${shopName}様を拝見し、とても魅力的なお店だと感じました。
現在ホームページをお持ちでないようでしたので、お力になれればと思いご連絡いたしました。

ホームページがあると、Googleで「${area} ${category}」と検索したお客様に見つけてもらえるようになります。${pitchLine}

飲食店・美容室・サロン・クリニック・ジム・スクールなど、さまざまな店舗ビジネスのホームページを制作しております。制作実績はこちらからご覧いただけます：

${config.PORTFOLIO_URL}

スマホ対応・SEO対策・予約フォームなど、集客に必要な機能を全て標準装備。
現在、先着5社様限定でPremiumプラン¥220,000（税込）でお受けしております。Lightプランは¥110,000（税込）から。

ご興味がございましたら、このメールにご返信いただくだけで結構です。
お見積もりは無料です。無理な勧誘は一切いたしません。

HNH Design Works
${config.OWNER_NAME}
${config.SMTP_USER}

※本メールはGoogleマップに公開されている情報をもとにお送りしております。
※今後のご案内が不要な場合は、その旨ご返信いただければ即時配信を停止いたします。`;

  return { subject, body };
}

async function run(options = {}) {
  console.log(`\n=== Composer — ${TODAY} ===`);

  const leads = parseCSV(config.TARGET_CSV);
  const unsubscribed = loadUnsubscribed();
  const queuedShops = getQueuedShops();
  let composed = 0;

  // Ensure queue directory exists
  if (!fs.existsSync(config.EMAIL_QUEUE)) {
    fs.mkdirSync(config.EMAIL_QUEUE, { recursive: true });
  }

  for (const lead of leads) {
    const shopName = lead['店名'];
    const email = lead['メールアドレス'];
    const status = lead['ステータス'] || '';

    // Skip if already sent, queued, or no email
    if (!email || !shopName) continue;
    if (status && status !== '未送信') continue;
    if (queuedShops.has(shopName)) continue;
    if (unsubscribed.has(email.toLowerCase())) continue;

    const { subject, body } = buildEmail(lead);
    const timestamp = new Date().toISOString();
    const filename = `${TODAY}_${shopName.replace(/[\/\\?%*:|"<>\s]/g, '_')}.json`;

    const emailData = {
      to: email,
      subject,
      body,
      shop_name: shopName,
      category: lead['業種'] || '',
      area: lead['エリア'] || '',
      phone: lead['電話番号'] || '',
      created_at: timestamp,
      status: 'queued',
      type: 'initial'
    };

    fs.writeFileSync(
      path.join(config.EMAIL_QUEUE, filename),
      JSON.stringify(emailData, null, 2),
      'utf-8'
    );
    composed++;
  }

  console.log(`  Emails composed: ${composed}`);
  console.log(`  Queue directory: ${config.EMAIL_QUEUE}`);
  return composed;
}

module.exports = { run, buildEmail };

if (require.main === module) {
  run().catch(console.error);
}
