#!/usr/bin/env node
// 業種別デモサイト用サムネイル画像を生成 (640×400 PNG)
// 出力先: screenshots/ss_{bar,nail,gym,clinic,law}.png

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUT = path.join(__dirname, '..', 'screenshots');
const W = 640, H = 400;

// ──────────────────────────────────────────
// 各業種のデザイン仕様
// ──────────────────────────────────────────
const specs = [
  {
    file: 'ss_bar.png',
    palette: { bg1: '#0A1628', bg2: '#050A14', accent: '#D4AF37', text: '#F4E9CF', sub: '#8B9AAD' },
    brand: 'NOCTURNE',
    brandSub: 'BAR · NISHIAZABU',
    tagline: 'Silence, to pour you a drink.',
    industry: 'BAR · CAFE',
    motif: 'glass'
  },
  {
    file: 'ss_nail.png',
    palette: { bg1: '#FFF5F5', bg2: '#F5D6DA', accent: '#C44569', text: '#4A3840', sub: '#8A7680' },
    brand: 'AETHER',
    brandSub: 'NAIL · MINAMI-AOYAMA',
    tagline: 'Quiet craft for your fingertips.',
    industry: 'NAIL SALON',
    motif: 'polish'
  },
  {
    file: 'ss_gym.png',
    palette: { bg1: '#0A0A0A', bg2: '#1A0505', accent: '#E53935', text: '#FFFFFF', sub: '#9A9A9A' },
    brand: 'APEX',
    brandSub: 'GYM · NAKAMEGURO',
    tagline: 'Beyond your yesterday.',
    industry: 'PERSONAL GYM',
    motif: 'bolt'
  },
  {
    file: 'ss_clinic.png',
    palette: { bg1: '#FAFDFF', bg2: '#E6EEF6', accent: '#4A7FB0', text: '#1C3046', sub: '#6A7E94' },
    brand: 'LUMEN',
    brandSub: 'CLINIC · OMOTESANDO',
    tagline: 'Precision, with your skin in mind.',
    industry: 'COSMETIC CLINIC',
    motif: 'cross'
  },
  {
    file: 'ss_law.png',
    palette: { bg1: '#0F2540', bg2: '#081629', accent: '#C9A876', text: '#FFFFFF', sub: '#8A98AD' },
    brand: 'SENTINEL',
    brandSub: 'LAW OFFICE · MARUNOUCHI',
    tagline: '信頼を、形にする。',
    industry: 'LAW OFFICE',
    motif: 'pillar'
  }
];

function drawGradient(ctx, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawRadial(ctx, cx, cy, r1, r2, c1, c2) {
  const g = ctx.createRadialGradient(cx, cy, r1, cx, cy, r2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// 業種ごとの右側モチーフ（SVG風の幾何図形）
function drawMotif(ctx, motif, palette) {
  ctx.save();
  const cx = W - 140, cy = 200;
  ctx.strokeStyle = palette.accent;
  ctx.fillStyle = palette.accent;

  if (motif === 'glass') {
    // マティーニグラスのシルエット
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy - 60);
    ctx.lineTo(cx + 50, cy - 60);
    ctx.lineTo(cx, cy + 10);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx, cy + 60);
    ctx.moveTo(cx - 30, cy + 60);
    ctx.lineTo(cx + 30, cy + 60);
    ctx.stroke();
    // 液面の輝き
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - 42, cy - 54);
    ctx.lineTo(cx + 42, cy - 54);
    ctx.lineTo(cx, cy - 2);
    ctx.closePath();
    ctx.fill();
  } else if (motif === 'polish') {
    // マニキュア瓶
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    // 蓋
    ctx.fillRect(cx - 18, cy - 70, 36, 30);
    // 瓶本体
    ctx.strokeRect(cx - 32, cy - 40, 64, 84);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(cx - 32, cy - 10, 64, 54);
  } else if (motif === 'bolt') {
    // 稲妻
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 70);
    ctx.lineTo(cx - 20, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx - 14, cy + 70);
    ctx.lineTo(cx + 24, cy - 10);
    ctx.lineTo(cx, cy - 10);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.fill();
  } else if (motif === 'cross') {
    // 医療十字
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    const arm = 30, thick = 16;
    ctx.beginPath();
    ctx.rect(cx - thick, cy - arm, thick * 2, arm * 2);
    ctx.rect(cx - arm, cy - thick, arm * 2, thick * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.fill();
    // サークル
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, arm + 22, 0, Math.PI * 2);
    ctx.stroke();
  } else if (motif === 'pillar') {
    // 3本の柱（司法・古典的モチーフ）
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * 30;
      ctx.fillRect(x - 8, cy - 54, 16, 108);
      ctx.beginPath();
      ctx.rect(x - 14, cy - 62, 28, 8);
      ctx.rect(x - 14, cy + 54, 28, 8);
      ctx.fill();
    }
    // 上部ペディメント
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 66);
    ctx.lineTo(cx + 60, cy - 66);
    ctx.lineTo(cx + 60, cy - 78);
    ctx.lineTo(cx, cy - 96);
    ctx.lineTo(cx - 60, cy - 78);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// アクセント細線・枠
function drawFrame(ctx, palette) {
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.restore();
}

// テキスト配置
function drawText(ctx, spec) {
  const { palette, brand, brandSub, tagline, industry } = spec;
  const leftX = 52;

  ctx.save();

  // 業種ラベル（上部、小さい）
  ctx.fillStyle = palette.accent;
  ctx.font = '600 11px "Inter", -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  const label = industry.split('').join(' ');
  ctx.fillText(label, leftX, 68);

  // 短い金線
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(leftX, 92);
  ctx.lineTo(leftX + 40, 92);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ブランド名（大）
  ctx.fillStyle = palette.text;
  const brandFont = brand.length <= 7 ? 56 : 46;
  ctx.font = `700 ${brandFont}px "Inter", -apple-system, sans-serif`;
  ctx.fillText(brand, leftX, 120);

  // ブランドサブ（英語 · 地名）
  ctx.fillStyle = palette.sub;
  ctx.font = '400 12px "Inter", -apple-system, sans-serif';
  ctx.fillText(brandSub, leftX, 190);

  // タグライン
  ctx.fillStyle = palette.text;
  ctx.font = 'italic 300 18px "Cormorant Garamond", "Hiragino Mincho ProN", serif';
  ctx.globalAlpha = 0.9;
  // 改行処理（長すぎる場合）
  const maxW = 340;
  let line = tagline;
  if (ctx.measureText(line).width > maxW) {
    const mid = Math.floor(line.length / 2);
    let cut = line.lastIndexOf(' ', mid + 10);
    if (cut < 0) cut = mid;
    const line1 = line.slice(0, cut).trim();
    const line2 = line.slice(cut).trim();
    ctx.fillText(line1, leftX, 248);
    ctx.fillText(line2, leftX, 274);
  } else {
    ctx.fillText(line, leftX, 260);
  }

  // フッター: HNH Design Works
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = palette.sub;
  ctx.font = '500 10px "Inter", -apple-system, sans-serif';
  ctx.fillText('H N H  D E S I G N  W O R K S', leftX, H - 52);

  ctx.restore();
}

function render(spec) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ベース背景
  drawGradient(ctx, spec.palette.bg1, spec.palette.bg2);

  // ソフト放射光（アクセント方向から）
  ctx.save();
  ctx.globalAlpha = 0.18;
  drawRadial(ctx, W - 180, 180, 20, 380, spec.palette.accent, 'rgba(0,0,0,0)');
  ctx.restore();

  // 細かいドットテクスチャ
  ctx.save();
  ctx.fillStyle = spec.palette.accent;
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  drawFrame(ctx, spec.palette);
  drawMotif(ctx, spec.motif, spec.palette);
  drawText(ctx, spec);

  return canvas.toBuffer('image/png');
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  specs.forEach(spec => {
    const buf = render(spec);
    const outPath = path.join(OUT, spec.file);
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${spec.file.padEnd(16)} ${(buf.length / 1024).toFixed(1)}KB  ${spec.brand}`);
  });
  console.log(`\n${specs.length} thumbnails written to ${OUT}/`);
}

main();
