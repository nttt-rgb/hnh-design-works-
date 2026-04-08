/**
 * site_checker.js — HP品質チェッカー
 * HP有りの店舗サイトにアクセスして品質スコアをつける。
 * スコア5点以下は「リデザイン対象」として営業可能に。
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const TIMEOUT_MS = 8000;

// Parse CSV line handling quotes
function parseCsvLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

function csvEscape(val) {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Extract domain from 備考 field
function extractDomain(note) {
  const m = note.match(/あり\(([^)]+)\)/);
  if (!m) return null;
  const d = m[1];
  if (d === 'Wix' || d === 'punycode') return null; // Can't check these reliably
  return d;
}

// Check a single site
async function checkSite(domain) {
  const urls = [`https://${domain}`, `http://${domain}`];
  let html = '';
  let finalUrl = '';
  let isHttps = false;
  let loadTime = 0;
  let error = null;

  for (const url of urls) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' }
      });
      clearTimeout(timeout);
      loadTime = Date.now() - start;
      html = await res.text();
      finalUrl = res.url;
      isHttps = finalUrl.startsWith('https');
      break;
    } catch (e) {
      error = e.message;
    }
  }

  if (!html) return { error: error || 'unreachable', score: -1 };

  const lowerHtml = html.toLowerCase();

  // Score starts at 10
  let score = 10;
  const issues = [];

  // 1. Viewport meta (mobile responsive) -3
  const hasViewport = lowerHtml.includes('viewport');
  if (!hasViewport) { score -= 3; issues.push('スマホ非対応'); }

  // 2. SSL -2
  if (!isHttps) { score -= 2; issues.push('SSL非対応'); }

  // 3. Load time > 3s -1
  if (loadTime > 3000) { score -= 1; issues.push(`読み込み${(loadTime/1000).toFixed(1)}秒`); }

  // 4. Contact form -1
  const hasForm = lowerHtml.includes('<form') || lowerHtml.includes('contact') || lowerHtml.includes('お問い合わせ') || lowerHtml.includes('問い合わせ');
  if (!hasForm) { score -= 1; issues.push('問い合わせフォームなし'); }

  // 5. Map -1
  const hasMap = lowerHtml.includes('google.com/maps') || lowerHtml.includes('maps.google') || lowerHtml.includes('goo.gl/maps') || lowerHtml.includes('iframe') && lowerHtml.includes('map');
  if (!hasMap) { score -= 1; issues.push('地図なし'); }

  // 6. SNS links -1
  const hasSns = lowerHtml.includes('instagram.com') || lowerHtml.includes('twitter.com') || lowerHtml.includes('x.com') || lowerHtml.includes('facebook.com') || lowerHtml.includes('line.me');
  if (!hasSns) { score -= 1; issues.push('SNSリンクなし'); }

  // 7. Old design indicators -2
  const oldIndicators = [
    lowerHtml.includes('flash'),
    lowerHtml.includes('frameset'),
    lowerHtml.includes('table') && !lowerHtml.includes('flexbox') && !lowerHtml.includes('grid') && !lowerHtml.includes('flex'),
    lowerHtml.includes('font face='),
    lowerHtml.includes('bgcolor'),
    lowerHtml.includes('marquee'),
  ].filter(Boolean).length;
  if (oldIndicators >= 2) { score -= 2; issues.push('デザインが古い'); }

  // Extract email from page
  const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  const emails = emailMatch ? [...new Set(emailMatch)].filter(e => !e.includes('example') && !e.includes('wixpress') && !e.includes('sentry')) : [];

  return { score, issues, isHttps, hasViewport, loadTime, hasForm, hasMap, hasSns, emails, finalUrl };
}

async function run() {
  console.log('\n=== Site Quality Checker ===\n');

  const csvPath = config.TARGET_CSV;
  const lines = fs.readFileSync(csvPath, 'utf-8').split('\n');
  const results = [];
  let checked = 0;
  let redesignCount = 0;
  let emailsFound = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols[7] !== 'あり') continue;

    const domain = extractDomain(cols[9] || '');
    if (!domain) {
      console.log(`  [SKIP] ${cols[0]} — domain不明 (${cols[9]})`);
      continue;
    }

    console.log(`  Checking: ${cols[0]} (${domain})...`);
    const result = await checkSite(domain);
    checked++;

    if (result.error) {
      console.log(`    ERROR: ${result.error}`);
      // Unreachable sites get score 3 (redesign target)
      result.score = 3;
      result.issues = ['サイトにアクセスできない'];
    }

    console.log(`    Score: ${result.score}/10 ${result.issues ? result.issues.join(', ') : ''}`);
    if (result.emails && result.emails.length) {
      console.log(`    Email found: ${result.emails.join(', ')}`);
    }

    // Update CSV if redesign target (score <= 5)
    if (result.score <= 5) {
      redesignCount++;
      // Update status
      while (cols.length < 13) cols.push('');
      cols[10] = 'リデザイン対象';
      // Add email if found and not already set
      if (!cols[3] && result.emails && result.emails.length) {
        cols[3] = result.emails[0];
        emailsFound++;
      }
      // Update 備考 with score
      cols[9] = csvEscape(`HP品質スコア: ${result.score}/10 (${result.issues.join(', ')}). 旧: ${cols[9]}`);
      lines[i] = cols.map(csvEscape).join(',');
    }

    results.push({
      line: i,
      name: cols[0],
      domain,
      score: result.score,
      issues: result.issues || [],
      emails: result.emails || [],
    });

    // Small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(csvPath, lines.join('\n'));

  // Generate report
  console.log('\n=== Results ===');
  console.log(`Checked: ${checked} sites`);
  console.log(`Redesign targets (≤5): ${redesignCount}`);
  console.log(`Emails found: ${emailsFound}`);
  console.log('\nScore breakdown:');
  results.sort((a, b) => a.score - b.score);
  results.forEach(r => {
    const tag = r.score <= 5 ? '★リデザイン対象' : '';
    console.log(`  ${r.score}/10  ${r.name} (${r.domain}) ${r.issues.join(', ')} ${tag}`);
    if (r.emails.length) console.log(`         Email: ${r.emails.join(', ')}`);
  });

  // Save results as JSON for downstream use
  fs.writeFileSync(path.join(config.ROOT, 'logs/site_check_results.json'), JSON.stringify(results, null, 2));

  return { checked, redesignCount, emailsFound, results };
}

module.exports = { run, checkSite };

if (require.main === module) {
  run().catch(console.error);
}
