#!/usr/bin/env node
// 業種別デモサイト用 SVG サムネイル生成 (640×400 viewBox)
// 出力先: screenshots/ss_{bar,nail,gym,clinic,law}.svg
//
// 使い方: node scripts/gen_thumbnails_svg.js

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'screenshots');

// ────────────────────────────────────────────
// 各業種デザイン仕様
// ────────────────────────────────────────────
const designs = [
  {
    file: 'ss_bar.svg',
    bg: ['#0A1628', '#050A14'],
    accent: '#D4AF37',
    text: '#F4E9CF',
    sub: '#8B9AAD',
    brand: 'NOCTURNE',
    brandSub: 'BAR · NISHIAZABU',
    tagline: 'Silence, to pour you a drink.',
    industry: 'BAR · CAFE',
    motif: 'glass'
  },
  {
    file: 'ss_nail.svg',
    bg: ['#FFE8EC', '#F8C8D1'],
    accent: '#C44569',
    text: '#4A2A35',
    sub: '#8A6570',
    brand: 'AETHER',
    brandSub: 'NAIL · MINAMI-AOYAMA',
    tagline: 'Quiet craft.',
    industry: 'NAIL SALON',
    motif: 'flower'
  },
  {
    file: 'ss_gym.svg',
    bg: ['#0A0A0A', '#1A0505'],
    accent: '#E53935',
    text: '#FFFFFF',
    sub: '#9A9A9A',
    brand: 'APEX',
    brandSub: 'GYM · NAKAMEGURO',
    tagline: 'Beyond your yesterday.',
    industry: 'PERSONAL GYM',
    motif: 'dumbbell'
  },
  {
    file: 'ss_clinic.svg',
    bg: ['#F5FAFF', '#CFDFEF'],
    accent: '#3B6EA5',
    text: '#0F2540',
    sub: '#6A7E94',
    brand: 'LUMEN',
    brandSub: 'CLINIC · OMOTESANDO',
    tagline: 'Precision & aesthetic.',
    industry: 'COSMETIC CLINIC',
    motif: 'cross'
  },
  {
    file: 'ss_law.svg',
    bg: ['#0F2540', '#081629'],
    accent: '#C9A876',
    text: '#FFFFFF',
    sub: '#8A98AD',
    brand: 'SENTINEL',
    brandSub: 'LAW · MARUNOUCHI',
    tagline: '信頼を、形にする。',
    industry: 'LAW OFFICE',
    motif: 'scales'
  }
];

// ────────────────────────────────────────────
// モチーフ SVG (右側に配置・cx=490, cy=200 を中心)
// ────────────────────────────────────────────
function motifGlass(accent) {
  // マティーニグラス: 三角カップ + ステム + 脚
  return `
    <g stroke="${accent}" stroke-width="4" fill="none" opacity="0.95">
      <path d="M 410 130 L 570 130 L 490 230 Z" fill="${accent}" fill-opacity="0.25"/>
      <line x1="490" y1="230" x2="490" y2="310"/>
      <line x1="455" y1="310" x2="525" y2="310"/>
    </g>
    <circle cx="460" cy="160" r="8" fill="${accent}" opacity="0.7"/>
  `;
}

function motifFlower(accent) {
  // 花: 5 枚の花弁 + 中心
  const cx = 490, cy = 200;
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72) - 90; // 上から時計回り
    const rad = angle * Math.PI / 180;
    const px = cx + Math.cos(rad) * 40;
    const py = cy + Math.sin(rad) * 40;
    petals += `
    <ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="36" ry="52" transform="rotate(${angle + 90} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${accent}" fill-opacity="0.55"/>`;
  }
  return `
    ${petals}
    <circle cx="${cx}" cy="${cy}" r="26" fill="#E5B769"/>
    <circle cx="${cx}" cy="${cy}" r="12" fill="${accent}"/>
  `;
}

function motifDumbbell(accent) {
  // ダンベル: 左右のウェイト + 中央のバー
  const cx = 490, cy = 200;
  return `
    <g fill="${accent}">
      <rect x="${cx - 110}" y="${cy - 48}" width="30" height="96" rx="4"/>
      <rect x="${cx - 80}" y="${cy - 30}" width="16" height="60" rx="3"/>
      <rect x="${cx - 64}" y="${cy - 10}" width="128" height="20" rx="4"/>
      <rect x="${cx + 64}" y="${cy - 30}" width="16" height="60" rx="3"/>
      <rect x="${cx + 80}" y="${cy - 48}" width="30" height="96" rx="4"/>
    </g>
    <g fill="#FFFFFF" opacity="0.12">
      <rect x="${cx - 110}" y="${cy - 48}" width="30" height="24" rx="4"/>
      <rect x="${cx + 80}" y="${cy - 48}" width="30" height="24" rx="4"/>
    </g>
  `;
}

function motifCross(accent) {
  // 医療十字 + サークル
  const cx = 490, cy = 200;
  return `
    <circle cx="${cx}" cy="${cy}" r="92" fill="none" stroke="${accent}" stroke-width="3" opacity="0.45"/>
    <circle cx="${cx}" cy="${cy}" r="74" fill="${accent}" fill-opacity="0.08"/>
    <g fill="${accent}">
      <rect x="${cx - 18}" y="${cy - 58}" width="36" height="116" rx="4"/>
      <rect x="${cx - 58}" y="${cy - 18}" width="116" height="36" rx="4"/>
    </g>
  `;
}

function motifScales(accent) {
  // 天秤: 支柱 + 横バー + 左右の皿
  const cx = 490, cy = 200;
  return `
    <g stroke="${accent}" stroke-width="4" fill="none" opacity="0.95">
      <!-- 支柱 -->
      <line x1="${cx}" y1="${cy - 100}" x2="${cx}" y2="${cy + 80}"/>
      <!-- 横バー -->
      <line x1="${cx - 90}" y1="${cy - 80}" x2="${cx + 90}" y2="${cy - 80}"/>
      <!-- 左吊り紐 -->
      <line x1="${cx - 80}" y1="${cy - 80}" x2="${cx - 80}" y2="${cy - 20}"/>
      <line x1="${cx - 80}" y1="${cy - 80}" x2="${cx - 60}" y2="${cy - 20}"/>
      <!-- 右吊り紐 -->
      <line x1="${cx + 80}" y1="${cy - 80}" x2="${cx + 60}" y2="${cy - 20}"/>
      <line x1="${cx + 80}" y1="${cy - 80}" x2="${cx + 100}" y2="${cy - 20}"/>
    </g>
    <!-- 左皿 -->
    <path d="M ${cx - 104} ${cy - 20} Q ${cx - 70} ${cy + 10} ${cx - 36} ${cy - 20}" stroke="${accent}" stroke-width="4" fill="${accent}" fill-opacity="0.25"/>
    <!-- 右皿 -->
    <path d="M ${cx + 36} ${cy - 20} Q ${cx + 70} ${cy + 10} ${cx + 104} ${cy - 20}" stroke="${accent}" stroke-width="4" fill="${accent}" fill-opacity="0.25"/>
    <!-- 基台 -->
    <polygon points="${cx - 50},${cy + 80} ${cx + 50},${cy + 80} ${cx + 30},${cy + 95} ${cx - 30},${cy + 95}" fill="${accent}"/>
    <!-- 支柱上の装飾 -->
    <circle cx="${cx}" cy="${cy - 100}" r="6" fill="${accent}"/>
  `;
}

const MOTIFS = {
  glass: motifGlass,
  flower: motifFlower,
  dumbbell: motifDumbbell,
  cross: motifCross,
  scales: motifScales,
};

// ────────────────────────────────────────────
// SVG 組み立て
// ────────────────────────────────────────────
function buildSVG(d) {
  const [c1, c2] = d.bg;
  const motifSvg = MOTIFS[d.motif](d.accent);
  const brandFontSize = d.brand.length <= 7 ? 72 : d.brand.length <= 9 ? 62 : 52;
  // 産業ラベル: 文字間に半角スペース
  const labelSpaced = d.industry.split('').join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${d.brand} ${d.industry} sample">
  <defs>
    <linearGradient id="bg-${d.motif}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow-${d.motif}" cx="0.78" cy="0.28" r="0.6">
      <stop offset="0%" stop-color="${d.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${d.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="640" height="400" fill="url(#bg-${d.motif})"/>
  <rect width="640" height="400" fill="url(#glow-${d.motif})"/>

  <!-- Decorative frame -->
  <rect x="24" y="24" width="592" height="352" fill="none" stroke="${d.accent}" stroke-width="1" opacity="0.35"/>

  <!-- Motif (right) -->
  ${motifSvg}

  <!-- Text: industry label (top-left) -->
  <text x="52" y="82" font-family="'Inter', -apple-system, sans-serif" font-size="13" font-weight="600" letter-spacing="2" fill="${d.accent}">${labelSpaced}</text>
  <line x1="52" y1="96" x2="96" y2="96" stroke="${d.accent}" stroke-width="1.5" opacity="0.85"/>

  <!-- Text: brand name (large) -->
  <text x="52" y="${160 + Math.floor((brandFontSize - 52) / 3)}" font-family="'Inter', -apple-system, sans-serif" font-size="${brandFontSize}" font-weight="800" letter-spacing="-1" fill="${d.text}">${d.brand}</text>

  <!-- Text: brand sub -->
  <text x="52" y="200" font-family="'Inter', -apple-system, sans-serif" font-size="12" font-weight="400" letter-spacing="2" fill="${d.sub}">${d.brandSub}</text>

  <!-- Text: tagline (italic serif) -->
  <text x="52" y="268" font-family="'Cormorant Garamond', 'Hiragino Mincho ProN', 'Yu Mincho', serif" font-size="20" font-style="italic" font-weight="400" fill="${d.text}" opacity="0.88">${d.tagline}</text>

  <!-- Footer: HNH credit -->
  <text x="52" y="352" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="500" letter-spacing="3" fill="${d.sub}" opacity="0.55">H N H  D E S I G N  W O R K S</text>
</svg>`;
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  designs.forEach(d => {
    const svg = buildSVG(d);
    const outPath = path.join(OUT, d.file);
    fs.writeFileSync(outPath, svg);
    console.log(`✓ ${d.file.padEnd(16)} ${(svg.length / 1024).toFixed(1)}KB  ${d.brand}  [${d.motif}]`);
  });
  console.log(`\n${designs.length} SVG thumbnails written to ${OUT}/`);
}

main();
