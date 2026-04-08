/**
 * scout.js — リード自動発見
 * Google Maps Places API で東京全域の店舗を検索し、
 * ウェブサイト欄が空の店舗を target_list.csv に追記する。
 * エリア×業種をローテーションで探索。
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

const TODAY = new Date().toISOString().slice(0, 10);

// Determine today's rotation slot based on day of year
function getTodaySlots() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const pairs = [];
  const areaCount = config.AREAS.length;
  const typeCount = config.TYPES.length;

  // Pick 15 area×type combos per day (for broader coverage)
  for (let i = 0; i < 15; i++) {
    const aIdx = (dayOfYear * 3 + i) % areaCount;
    const tIdx = (dayOfYear + i) % typeCount;
    pairs.push({ area: config.AREAS[aIdx], type: config.TYPES[tIdx] });
  }
  return pairs;
}

// Load existing shop names to avoid duplicates
function loadExistingNames() {
  const names = new Set();
  if (!fs.existsSync(config.TARGET_CSV)) return names;
  const lines = fs.readFileSync(config.TARGET_CSV, 'utf-8').split('\n');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[0]) names.add(cols[0].trim());
  }
  return names;
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

// Search Google Maps Places API
async function searchPlaces(area, type) {
  if (!config.GOOGLE_MAPS_API_KEY) {
    console.log(`  [SKIP] GOOGLE_MAPS_API_KEY not set. Cannot search.`);
    return [];
  }

  const query = encodeURIComponent(`${area} ${config.TYPE_LABELS[type] || type}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=ja&key=${config.GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') {
      console.log(`  [WARN] Places API status: ${data.status}`);
      return [];
    }
    return data.results || [];
  } catch (err) {
    console.log(`  [ERROR] Places API: ${err.message}`);
    return [];
  }
}

// Get place details (website, phone, email)
async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,url';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ja&key=${config.GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.result || {};
  } catch (err) {
    return {};
  }
}

// Escape CSV field
function csvEscape(val) {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function run(options = {}) {
  console.log(`\n=== Scout Agent — ${TODAY} ===`);
  console.log(`  ハードリミット: 日次${config.DAILY_API_LIMIT}回, 1実行${config.PER_RUN_API_LIMIT}回`);

  const existingNames = loadExistingNames();
  const unsubscribed = loadUnsubscribed();
  const slots = getTodaySlots();
  let newLeads = 0;
  let runCount = 0;

  // Load today's usage (auto-resets on new day)
  const usage = config.loadApiUsage();

  // Pre-flight check
  if (usage.requests >= config.DAILY_API_LIMIT) {
    console.log(`  API制限に達しました。本日の実行を停止します。(${usage.requests}/${config.DAILY_API_LIMIT})`);
    return 0;
  }

  console.log(`  本日のAPI使用量: ${usage.requests}/${config.DAILY_API_LIMIT} (残り${config.DAILY_API_LIMIT - usage.requests}回)`);

  // Ensure CSV exists with header
  if (!fs.existsSync(config.TARGET_CSV)) {
    fs.writeFileSync(config.TARGET_CSV,
      '店名,業種,エリア,メールアドレス,電話番号,Google評価,レビュー数,HP有無,Instagram,備考,ステータス,送信日,返信日\n'
    );
  }

  let stopped = false;

  for (const slot of slots) {
    if (stopped) break;

    // --- Guard: Text Search request ---
    const searchCheck = config.recordApiRequest(usage, runCount);
    if (!searchCheck.ok) {
      console.log(`  ${searchCheck.stopped}`);
      stopped = true;
      break;
    }
    if (searchCheck.warning) console.log(`  ${searchCheck.warning}`);
    runCount++;

    console.log(`  Searching: ${slot.area} × ${config.TYPE_LABELS[slot.type] || slot.type}`);
    const places = await searchPlaces(slot.area, slot.type);
    console.log(`  Found ${places.length} results (API: ${usage.requests}/${config.DAILY_API_LIMIT}, run: ${runCount}/${config.PER_RUN_API_LIMIT})`);

    for (const place of places) {
      if (existingNames.has(place.name)) continue;

      // --- Guard: Place Details request ---
      const detailCheck = config.recordApiRequest(usage, runCount);
      if (!detailCheck.ok) {
        console.log(`  ${detailCheck.stopped}`);
        stopped = true;
        break;
      }
      if (detailCheck.warning) console.log(`  ${detailCheck.warning}`);
      runCount++;

      const details = await getPlaceDetails(place.place_id);

      // Skip if has a website
      if (details.website) continue;

      const row = [
        csvEscape(details.name || place.name),
        csvEscape(config.TYPE_LABELS[slot.type] || slot.type),
        csvEscape(slot.area),
        '',  // email (not available from Places API)
        csvEscape(details.formatted_phone_number || ''),
        details.rating || '',
        details.user_ratings_total || '',
        'なし',
        '',  // Instagram (not available from Places API)
        csvEscape(`Google Maps経由で自動取得 (${TODAY})`),
        '未送信',
        '',
        ''
      ].join(',');

      fs.appendFileSync(config.TARGET_CSV, row + '\n');
      existingNames.add(details.name || place.name);
      newLeads++;

      // Rate limit: 100ms between detail requests
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`  New leads added: ${newLeads}`);
  console.log(`  Total leads: ${existingNames.size}`);
  console.log(`  API: 今回${runCount}回 / 本日合計${usage.requests}回 / 上限${config.DAILY_API_LIMIT}回`);
  if (stopped) {
    console.log(`  Scout stopped early due to API rate limit.`);
  }
  return newLeads;
}

module.exports = { run };

if (require.main === module) {
  run().catch(console.error);
}
