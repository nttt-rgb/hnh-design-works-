require('dotenv').config({ path: require('path').join(require('os').homedir(), 'Desktop/.env') });

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

module.exports = {
  ROOT,

  // Paths
  TARGET_CSV: path.join(ROOT, 'campaigns/direct_outreach/target_list.csv'),
  SEND_LOG: path.join(ROOT, 'campaigns/direct_outreach/send_log.csv'),
  DASHBOARD: path.join(ROOT, 'campaigns/direct_outreach/dashboard.md'),
  EMAIL_QUEUE: path.join(ROOT, 'campaigns/direct_outreach/email_queue'),
  UNSUBSCRIBE_LIST: path.join(ROOT, 'campaigns/direct_outreach/unsubscribe_list.csv'),
  TEMPLATE_FILE: path.join(ROOT, 'campaigns/direct_outreach/email_templates.md'),
  LOG_FILE: path.join(ROOT, 'logs/pipeline.log'),

  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',

  // SMTP
  SMTP_USER: process.env.SMTP_USER || 'hnhdesignworks@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS || '',

  // Limits
  DAILY_SEND_LIMIT: parseInt(process.env.DAILY_SEND_LIMIT || '50', 10),
  SEND_INTERVAL_MS: parseInt(process.env.SEND_INTERVAL_MS || '120000', 10),
  FOLLOWUP_DAYS: parseInt(process.env.FOLLOWUP_DAYS || '7', 10),
  MAX_CONSECUTIVE_FAILURES: 5,

  // ============================================================
  // Places API ハードリミット（変更厳禁）
  // .env や環境変数からの上書き不可。コスト上限: 月$75以下
  // Text Search: $32/1000req, Place Details: $17/1000req
  // 50req/日 → 最大 $2.5/日, $75/月
  // ============================================================
  DAILY_API_LIMIT: 50,            // 1日の絶対上限（ハードコード）
  PER_RUN_API_LIMIT: 30,          // 1実行あたりの上限（ハードコード）
  API_WARNING_THRESHOLD: 40,      // 警告を出す閾値（日次上限の80%）
  API_USAGE_FILE: path.join(ROOT, 'logs/api_usage.json'),

  // Owner
  OWNER_NAME: process.env.OWNER_NAME || '豊川 直也',

  // Scout rotation
  AREAS: [
    '渋谷', '原宿', '表参道', '代官山', '恵比寿', '中目黒', '自由が丘',
    '三軒茶屋', '下北沢', '銀座', '新橋', '六本木', '赤坂', '麻布十番',
    '広尾', '新宿', '新大久保', '高田馬場', '池袋', '目白', '上野',
    '浅草', '秋葉原', '神田', '日本橋', '品川', '五反田', '大崎',
    '吉祥寺', '三鷹', '立川', '町田', '二子玉川', '成城', '経堂'
  ],
  TYPES: [
    'restaurant', 'cafe', 'bar', 'bakery',
    'hair_care', 'beauty_salon', 'spa',
    'gym', 'yoga_studio', 'physiotherapist',
    'dentist', 'doctor', 'veterinary_care',
    'pet_store', 'real_estate_agency',
    'accounting', 'lawyer',
    'school', 'florist', 'photographer'
  ],
  TYPE_LABELS: {
    restaurant: '飲食店', cafe: 'カフェ', bar: 'バー', bakery: 'ベーカリー',
    hair_care: '美容室', beauty_salon: 'エステサロン', spa: 'マッサージ・スパ',
    gym: 'パーソナルジム', yoga_studio: 'ヨガスタジオ', physiotherapist: '整体院・鍼灸院',
    dentist: '歯科医院', doctor: 'クリニック', veterinary_care: '動物病院',
    pet_store: 'ペットサロン', real_estate_agency: '不動産',
    accounting: '士業', lawyer: '弁護士事務所',
    school: 'スクール', florist: '花屋', photographer: '写真スタジオ'
  },

  // Industry-specific pitch lines
  PITCH_LINES: {
    '飲食店': 'お料理の魅力やこだわりの食材を、写真と文章で余すことなくお伝えできます。',
    'カフェ': 'お店の雰囲気やメニューを、訪れたくなるビジュアルでお届けします。',
    'バー': '大人の隠れ家のような空間を、Web上でも表現いたします。',
    'ベーカリー': '焼きたてパンの魅力を、毎日の新商品情報とともにお届けできます。',
    '美容室': 'スタイリストの技術やサロンの雰囲気を、お客様に直感的に伝えられます。',
    'エステサロン': '施術メニューやビフォーアフターを、信頼感のあるデザインでご紹介します。',
    'マッサージ・スパ': '癒しの空間と施術内容を、来店前にしっかりお伝えできます。',
    'パーソナルジム': 'トレーナーの実績やプログラム内容を、説得力のある形で発信できます。',
    'ヨガスタジオ': 'レッスンスケジュールやインストラクター紹介を、わかりやすく掲載できます。',
    '整体院・鍼灸院': '施術の特徴や患者様の声を、安心感のあるサイトでお伝えします。',
    '歯科医院': '診療内容やスタッフ紹介を、清潔感のあるデザインで掲載できます。',
    'クリニック': '診療科目やアクセス情報を、患者様が迷わない導線で構成します。',
    '動物病院': '診療内容や設備紹介を、飼い主様に安心していただけるサイトで発信します。',
    'ペットサロン': 'トリミングメニューやかわいい仕上がり写真を掲載できます。',
    '不動産': '物件情報やエリアの魅力を、効果的にアピールできます。',
    '士業': '専門分野や実績を、信頼感のあるプロフェッショナルなサイトで発信します。',
    '弁護士事務所': '取扱分野や相談の流れを、わかりやすくご案内できます。',
    'スクール': 'カリキュラムや講師紹介、生徒の声を掲載して入会促進につなげます。',
    '花屋': '季節の花やアレンジメントの魅力を、美しいビジュアルでお届けします。',
    '写真スタジオ': 'ポートフォリオやプラン紹介を、作品の魅力が伝わるデザインで。',
  },

  // Portfolio URL
  PORTFOLIO_URL: 'https://hnh-design-works.vercel.app',

  // --- Places API usage tracker ---

  loadApiUsage() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = JSON.parse(fs.readFileSync(this.API_USAGE_FILE, 'utf-8'));
      if (data.date === today) return data;
    } catch {}
    return { date: today, requests: 0 };
  },

  saveApiUsage(usage) {
    const dir = path.dirname(this.API_USAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.API_USAGE_FILE, JSON.stringify(usage, null, 2));
  },

  /**
   * Record one API request. Returns false if limit reached (request should NOT be made).
   * @param {object} usage - current usage object
   * @param {number} runCount - requests made in this run so far
   * @returns {{ ok: boolean, usage: object, warning?: string, stopped?: string }}
   */
  recordApiRequest(usage, runCount) {
    // Hard stop: daily
    if (usage.requests >= 50) {
      return { ok: false, usage, stopped: 'API制限に達しました。本日の実行を停止します。' };
    }
    // Hard stop: per-run
    if (runCount >= 30) {
      return { ok: false, usage, stopped: '1回の実行上限（30リクエスト）に達しました。停止します。' };
    }

    usage.requests++;
    this.saveApiUsage(usage);

    // Warning at 80%
    let warning;
    if (usage.requests === 40) {
      warning = `[WARN] 日次API上限の80%に到達しました（${usage.requests}/50）。残り${50 - usage.requests}リクエスト。`;
    }

    return { ok: true, usage, warning };
  },
};
