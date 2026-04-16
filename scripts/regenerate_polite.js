#!/usr/bin/env node
// 既存 queued な _v2.json を polite + 心理誘導型の全面新トーンに書き換え。
// 相手のサンプルサイトは見せない方針に合わせ、URL / 価格情報を削除。
// 返信駆動（Zeigarnik + 事前 reciprocity + foot-in-the-door）設計。
// sent 済みは対象外。
//
// 使い方:
//   node scripts/regenerate_polite.js              # 本番適用
//   node scripts/regenerate_polite.js --dry-run    # 差分プレビュー
//   node scripts/regenerate_polite.js --force      # 既に polite-v1 のものも上書き

const fs = require('fs');
const path = require('path');

const QUEUE = path.join(__dirname, '..', 'campaigns', 'direct_outreach', 'email_queue');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ────────────────────────────────────────────
// カテゴリ → 業種バケット
// ────────────────────────────────────────────
function bucketOf(cat) {
  if (/バー|居酒屋|カフェ|ベーカリー|ラーメン|寿司|フレンチ|焼肉|飲食店/.test(cat)) return 'food';
  if (/美容室|ネイル|脱毛|エステ|まつげ/.test(cat)) return 'beauty';
  if (/ジム|ヨガ|ピラティス|写真スタジオ/.test(cat)) return 'studio';
  if (/法律事務所|社会保険労務士|税理士|会計事務所|司法書士/.test(cat)) return 'legal';
  if (/教室|スクール|塾|学校|インターナショナル/.test(cat)) return 'school';
  return 'other';
}

// ────────────────────────────────────────────
// カテゴリ → 呼称
// ────────────────────────────────────────────
function entityRefOf(cat) {
  if (/サロン|ネイル|脱毛|エステ|まつげ/.test(cat)) return { formal: '貴サロン', casual: 'サロン' };
  if (/スタジオ/.test(cat)) return { formal: '貴スタジオ', casual: 'スタジオ' };
  if (/ジム/.test(cat)) return { formal: '貴ジム', casual: 'ジム' };
  if (/教室|スクール|塾|学校|インターナショナル/.test(cat)) return { formal: '貴教室', casual: '教室' };
  if (/事務所|法人|法律|税理士|社会保険|司法書士/.test(cat)) return { formal: '貴事務所', casual: '事務所' };
  return { formal: '貴店', casual: 'お店' };
}

// ────────────────────────────────────────────
// レビュー数 × 評価 × カテゴリ → 褒めポイント文
// ────────────────────────────────────────────
function brandNoteFor(cat, rating, reviews) {
  const R = rating !== null && rating !== '?' && !isNaN(parseFloat(rating)) ? parseFloat(rating) : null;
  const N = reviews !== null && reviews !== '?' && !isNaN(parseInt(reviews, 10)) ? parseInt(reviews, 10) : null;
  const praise = [];
  if (R !== null && R >= 4.5) praise.push(`評価${R}の高い満足度`);
  else if (R !== null && R >= 4.0) praise.push(`評価${R}の安定感`);
  if (N !== null && N >= 100) praise.push(`${N}件のレビューから感じる支持の厚み`);

  const catPhrase = {
    バー: '落ち着いた雰囲気と写真のトーン',
    居酒屋: '料理の盛り付けや店内の空気感',
    カフェ: 'インテリアと料理写真の世界観',
    ベーカリー: '焼きたてパンのビジュアルと店の佇まい',
    ラーメン: 'メニュー写真の迫力',
    飲食店: '料理写真の統一感',
    寿司: '料理の繊細さとカウンターの空気感',
    フレンチ: '料理の繊細さと盛り付けの美しさ',
    焼肉: 'お肉の質感と焼き場の臨場感',
    美容室: 'サロンの世界観とヘアスタイル写真のトーン',
    ネイルサロン: 'ニュアンスネイルの色彩センス',
    脱毛サロン: '施術環境の清潔感とご説明の分かりやすさ',
    エステサロン: '店内の落ち着きと施術の専門性',
    まつげサロン: 'デザインのバリエーションと丁寧な施術',
    パーソナルジム: 'トレーニング環境と指導スタイル',
    ヨガスタジオ: 'レッスン風景と空間の抜け感',
    ピラティススタジオ: 'スタジオの雰囲気と指導の専門性',
    写真スタジオ: '撮影スペースの多様性と仕上がり写真',
    花屋: 'アレンジメントの色彩センス',
    結婚相談所: '相談風景と成婚事例',
    法律事務所: '取扱業務の専門性とご発信の明快さ',
    社会保険労務士法人: '労務相談の実務経験と丁寧なご発信',
    税理士事務所: '会計実務の経験と誠実なご発信',
    インターナショナルスクール: '教育理念と日々の活動の丁寧なご発信',
  };
  const cp = catPhrase[cat] || 'お仕事のトーン';
  if (praise.length === 0) return cp;
  return `${cp}と${praise.join('、')}`;
}

// ────────────────────────────────────────────
// owner_profile.primary_type に応じた補足センテンス
// ────────────────────────────────────────────
function typeLine(type, entity, brandNote, area, cat) {
  if (type === 'logical') {
    const query = area && cat ? `「${area} ${cat}」で検索される方` : '検索からお店を知る方';
    return `ご発信の明快さと、お客様への誠実な姿勢が伝わってまいります。一点、検索需要の観点から僭越ながらお伝えさせてください。${query}の受け皿となるホームページが一つあると、Instagram経由とは別の入口を確保できる可能性が高いかと存じます。`;
  }
  if (type === 'anxious') {
    return `丁寧なご姿勢が伝わってまいります。恐縮ながら、同業の${entity.casual}オーナー様から「Instagramはご覧いただけるけれど、新規のお問い合わせが月々安定しない」というご相談を多くちょうだいしており、もし似たようなご不安をお持ちでしたら、少しでもお力になれればと思っております。`;
  }
  if (type === 'intuitive') {
    return `このクオリティを日々積み重ねていらっしゃるのは、率直に凄いことだと感じます。`;
  }
  // emotional + default
  return `一つひとつのご投稿から、お仕事の丁寧さや、お客様に向き合っていらっしゃる姿勢が自然と伝わってまいります。`;
}

// ────────────────────────────────────────────
// 全文ビルダー
// ────────────────────────────────────────────
function buildBody({ shop, cat, area, type, rating, reviews }) {
  const entity = entityRefOf(cat);
  const brandNote = brandNoteFor(cat, rating, reviews);
  const typeL = typeLine(type || 'emotional', entity, brandNote, area, cat);
  const casualRef = entity.casual === 'お店' ? 'お店' : `この${entity.casual}`;
  const casualRef2 = entity.casual === 'お店' ? 'このお店' : `この${entity.casual}`;

  return `突然のご連絡、失礼いたします。HNH Design Worksの豊川と申します🙇‍♂️

${shop}様のInstagramを拝見させていただき、${brandNote}に感銘を受けました。${typeL}

拝見しているうちに「もし${casualRef2}のホームページを一枚ラフに描くなら、こんな形だろうか」というイメージが自然と浮かんでまいりまして、せっかくですので、そのラフ案（画像1枚）と、Instagramから感じた気づきを2〜3点まとめて、お送りできればと思っております。

もしご興味をお持ちいただけましたら「見てみたい」「気になる」など一言だけで結構ですので、お返事いただけますと幸いです。ご判断やご返信の内容は、その後で全く問題ございません🙏

──────────────────
HNH Design Works
Naoya Toyokawa
hnh.designworks@gmail.com
──────────────────`;
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────
function main() {
  const files = fs.readdirSync(QUEUE).filter(f => f.endsWith('_v2.json')).sort();
  const summary = { updated: 0, skippedSent: 0, skippedAlreadyPolite: 0, skippedInvalid: 0, byType: {} };
  const samples = {};

  for (const f of files) {
    const fp = path.join(QUEUE, f);
    let j;
    try { j = JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch (e) { summary.skippedInvalid++; continue; }

    if (j.status !== 'queued') { summary.skippedSent++; continue; }
    if (!FORCE && j.template_variation === 'polite-v1') { summary.skippedAlreadyPolite++; continue; }

    // reason から rating/reviews を抽出
    const reasonStr = j.owner_profile?.reason || '';
    const ratingMatch = reasonStr.match(/rating=([0-9.?]+)/);
    const reviewsMatch = reasonStr.match(/reviews=([0-9?]+)/);
    const rating = ratingMatch && ratingMatch[1] !== '?' ? ratingMatch[1] : null;
    const reviews = reviewsMatch && reviewsMatch[1] !== '?' ? reviewsMatch[1] : null;

    const type = j.owner_profile?.primary_type || 'emotional';
    const shop = j.shop_name;
    const cat = j.category || '';
    const area = j.area || '';

    const newBody = buildBody({ shop, cat, area, type, rating, reviews });

    summary.byType[type] = (summary.byType[type] || 0) + 1;
    if (!samples[type]) samples[type] = { shop, cat, area, file: f, body: newBody };

    if (!DRY) {
      j.body = newBody;
      j.template_variation = 'polite-v1';
      j.regenerated_at = new Date().toISOString();
      fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
    }
    summary.updated++;
  }

  console.log(`━━━ 再生成結果${DRY ? ' (DRY-RUN)' : ''} ━━━`);
  console.log(`  対象更新:     ${summary.updated} 件`);
  console.log(`  sent等スキップ: ${summary.skippedSent} 件`);
  console.log(`  既polite-v1:  ${summary.skippedAlreadyPolite} 件`);
  if (summary.skippedInvalid) console.log(`  parse失敗:   ${summary.skippedInvalid} 件`);
  console.log('\n  primary_type 内訳:');
  for (const [t, n] of Object.entries(summary.byType)) console.log(`    ${t.padEnd(10)} ${n} 件`);

  console.log('\n━━━ サンプル（各タイプ先頭1件） ━━━');
  for (const [t, s] of Object.entries(samples)) {
    console.log(`\n【${t}】${s.shop} / ${s.cat} / ${s.area}  (${s.file})`);
    console.log(s.body);
  }
  if (DRY) console.log('\n(※ --dry-run のためファイルは変更していません)');
}

main();
