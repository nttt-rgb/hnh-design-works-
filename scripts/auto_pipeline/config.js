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
  // Places API コスト管理（月間$200無料クレジット内で運用）
  // Text Search: $0.032/req ($32/1000)
  // Place Details: $0.017/req ($17/1000)
  // 1コンボ（1検索+20詳細）= $0.032 + $0.017×20 = $0.372
  // ============================================================
  COST_TEXT_SEARCH: 0.032,
  COST_PLACE_DETAILS: 0.017,
  MONTHLY_BUDGET: 200,            // 月間無料枠 $200
  MONTHLY_WARNING_THRESHOLD: 180, // 警告閾値 $180（無料枠の90%）
  ALLOW_PAID: false,              // trueにすると$200超えても続行（課金発生）
  PER_RUN_API_LIMIT: 30,           // 1実行あたりの上限
  API_USAGE_FILE: path.join(ROOT, 'logs/api_usage.json'),
  MONTHLY_USAGE_FILE: path.join(ROOT, 'logs/api_usage_monthly.json'),

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
    'hair_care', 'beauty_salon', 'nail_salon', 'lash_salon', 'hair_removal', 'spa',
    'gym', 'yoga_studio', 'pilates_studio', 'dance_studio',
    'physiotherapist', 'massage',
    'dentist', 'doctor', 'veterinary_care',
    'pet_store', 'real_estate_agency',
    'accounting', 'administrative_scrivener', 'labor_consultant', 'lawyer',
    'school', 'english_school', 'music_school', 'programming_school',
    'florist', 'photographer', 'laundry',
    'car_repair', 'general_contractor', 'insurance_agency',
    'marriage_agency', 'psychic', 'coworking'
  ],
  TYPE_LABELS: {
    restaurant: '飲食店', cafe: 'カフェ', bar: 'バー', bakery: 'ベーカリー',
    hair_care: '美容室', beauty_salon: 'エステサロン', nail_salon: 'ネイルサロン',
    lash_salon: 'まつげサロン', hair_removal: '脱毛サロン', spa: 'マッサージ・スパ',
    gym: 'パーソナルジム', yoga_studio: 'ヨガスタジオ', pilates_studio: 'ピラティススタジオ',
    dance_studio: 'ダンススタジオ',
    physiotherapist: '整体院・鍼灸院', massage: 'マッサージ',
    dentist: '歯科医院', doctor: 'クリニック', veterinary_care: '動物病院',
    pet_store: 'ペットサロン', real_estate_agency: '不動産',
    accounting: '税理士事務所', administrative_scrivener: '行政書士事務所',
    labor_consultant: '社労士事務所', lawyer: '弁護士事務所',
    school: '学習塾', english_school: '英会話教室', music_school: '音楽教室',
    programming_school: 'プログラミングスクール',
    florist: '花屋', photographer: '写真スタジオ', laundry: 'クリーニング店',
    car_repair: '自動車整備工場', general_contractor: 'リフォーム・工務店',
    insurance_agency: '保険代理店',
    marriage_agency: '結婚相談所', psychic: '占い・カウンセリング',
    coworking: 'コワーキングスペース'
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
    'ネイルサロン': 'デザインギャラリーやメニュー・料金を、トレンド感のあるサイトで発信できます。',
    'まつげサロン': '施術メニューやデザインカタログを、上品なビジュアルでお届けします。',
    '脱毛サロン': '施術プランや料金体系を、わかりやすく安心感のあるサイトでご紹介します。',
    'ピラティススタジオ': 'レッスン内容やスタジオの雰囲気を、健康的なイメージで発信できます。',
    'ダンススタジオ': 'レッスンスケジュールやインストラクター紹介を、躍動感のあるデザインで。',
    'マッサージ': '施術メニューやアクセス情報を、リラックス感のあるサイトでお伝えします。',
    '税理士事務所': '専門分野や実績を、信頼感のあるプロフェッショナルなサイトで発信します。',
    '行政書士事務所': '取扱業務や相談の流れを、わかりやすくご案内できるサイトを制作します。',
    '社労士事務所': '顧問サービスや対応業務を、企業向けに信頼感のあるデザインで。',
    '学習塾': 'コース紹介や合格実績、講師紹介を掲載して入塾促進につなげます。',
    '英会話教室': 'レッスンプランや講師紹介を、グローバルな雰囲気で発信できます。',
    '音楽教室': 'レッスン内容や講師プロフィールを、音楽の魅力が伝わるサイトで。',
    'プログラミングスクール': 'カリキュラムや受講生の声を、モダンなデザインでアピールできます。',
    'クリーニング店': 'サービス内容や料金を、清潔感のあるシンプルなサイトでご紹介します。',
    '自動車整備工場': '対応車種やサービス内容を、安心感のあるプロフェッショナルなサイトで。',
    'リフォーム・工務店': '施工事例やサービス内容を、ビフォーアフター写真で効果的にアピール。',
    '保険代理店': '取扱商品や相談の流れを、信頼感のあるデザインでご案内します。',
    '結婚相談所': 'サービス内容や成婚実績を、温かみのあるデザインでお届けします。',
    '占い・カウンセリング': 'メニューや鑑定師紹介を、神秘的で信頼感のあるサイトで発信。',
    'コワーキングスペース': '設備や料金プランを、モダンで洗練されたデザインでご紹介します。',
  },

  // Portfolio URL
  PORTFOLIO_URL: 'https://hnh-design-works.vercel.app',

  // --- Places API usage tracker (月間コスト管理) ---

  loadMonthlyUsage() {
    const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    try {
      const data = JSON.parse(fs.readFileSync(this.MONTHLY_USAGE_FILE, 'utf-8'));
      if (data.month === month) return data;
    } catch {}
    return { month, total_requests: 0, text_search_count: 0, details_count: 0, estimated_cost: 0 };
  },

  saveMonthlyUsage(usage) {
    const dir = path.dirname(this.MONTHLY_USAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.MONTHLY_USAGE_FILE, JSON.stringify(usage, null, 2));
  },

  // Daily usage (累積、リセット禁止)
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
   * Record one API request with cost tracking.
   * @param {object} usage - daily usage
   * @param {number} runCount - requests in this run
   * @param {'text_search'|'details'} requestType - type of API call
   * @returns {{ ok: boolean, usage: object, warning?: string, stopped?: string }}
   */
  recordApiRequest(usage, runCount, requestType = 'details') {
    // Per-run limit
    if (runCount >= this.PER_RUN_API_LIMIT) {
      return { ok: false, usage, stopped: `1回の実行上限（${this.PER_RUN_API_LIMIT}リクエスト）に達しました。停止します。` };
    }

    // Monthly cost check
    const monthly = this.loadMonthlyUsage();
    if (monthly.estimated_cost >= this.MONTHLY_BUDGET && !this.ALLOW_PAID) {
      return { ok: false, usage, stopped: `無料枠の上限に達しました（$${monthly.estimated_cost.toFixed(2)}/$${this.MONTHLY_BUDGET}）。これ以上のリクエストは課金されます。続行する場合はconfig.jsのALLOW_PAID=trueに変更してください。` };
    }

    // Update daily
    usage.requests++;
    this.saveApiUsage(usage);

    // Update monthly with cost
    const cost = requestType === 'text_search' ? this.COST_TEXT_SEARCH : this.COST_PLACE_DETAILS;
    monthly.total_requests++;
    if (requestType === 'text_search') monthly.text_search_count++;
    else monthly.details_count++;
    monthly.estimated_cost = parseFloat((monthly.estimated_cost + cost).toFixed(4));
    this.saveMonthlyUsage(monthly);

    // Warnings
    let warning;
    if (monthly.estimated_cost >= this.MONTHLY_WARNING_THRESHOLD && monthly.estimated_cost - cost < this.MONTHLY_WARNING_THRESHOLD) {
      warning = `[WARN] 無料枠の90%に達しました（$${monthly.estimated_cost.toFixed(2)}/$${this.MONTHLY_BUDGET}）。続行しますか？`;
    }

    return { ok: true, usage, warning };
  },
};
