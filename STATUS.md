# HNH Design Works — プロジェクト現状

**最終更新:** 2026-04-13
**目的:** 次セッション開始時に現状を即把握できるサマリー

> このファイルは CLAUDE.md と一緒に必ず読むこと（CLAUDE.md の重要ルール #1 を遵守するため）。

---

## 🎯 事業目標（CLAUDE.md追加）
- **全プロジェクト合計**: 月収 ¥5,000,000（天井なし）
- **HNH Design Works 最低ライン**: 月収 ¥2,000,000
  - Premium ¥250k × 4 + Standard ¥150k × 4 + Light ¥100k × 4 = 月12件受注
- 全ての意思決定・提案・戦略はこの目標に基づく
- 「安全策」より「最速で目標到達」を優先

**月12件受注に必要な営業数**: 返信率2% × 成約率25% → **日20件 / 月600件のアプローチ必要**
**現状ギャップ**: 今日43件アプローチ → 月換算 約860件。ペースはOK。ただし **リード発掘がボトルネック**

---

## 🆕 2026-04-13 追加アセット（サービスラインナップ拡張：Koe サブサービス）

Web制作後の月額継続収益源を追加する目的で `services/` ディレクトリを新設。
当初別プロジェクトとして着手していた副業ツール群を HNH サブサービスとして統合。

### サービスラインナップ（CLAUDE.md に追記済み）

| # | サービス | 料金 | 位置づけ | 実装状況 |
|---|---------|------|---------|---------|
| 1 | Web制作（本業） | ¥100K–¥250K 初期 | 受注パイプライン | 既存 |
| 2 | **Koe（声）** | **¥20,000/月** | Web制作納品後の月次レビュー分析レポート（解約防止＋LTV向上） | **✅ MVP完成** |
| 3 | Slides | スポット/月額 ¥5K–¥30K | 提案資料・月次レポートのスライド自動生成 | 部分実装 |

**月商シミュレーション**: Web¥2M + Koe¥200K（10店舗）+ Slides¥195K = **¥2,395,000**（+20%上積み）

### Koe の中身（`services/koe/`）

| ファイル | 役割 |
|---|---|
| `koe/fetch_reviews.py` | Google Places API (New) v1 + ローカルJSONフォールバック。`PlaceSnapshot` で店舗全体★・総レビュー数を保持 |
| `koe/analyze.py` | Claude で構造化JSON分析。前月比較データがあれば `trend` セクションを生成 |
| `koe/diff.py` | スナップショット自動検出・機械的差分計算（★デルタ／新規/消失レビュー） |
| `koe/prompts.py` | 本分析＋トレンド分析の両対応プロンプト |
| `koe/charts.py` | matplotlib で評価分布の横棒＋★推移折れ線の PNG 生成（日本語=Hiragino Sans 自動検出） |
| `koe/report.py` | ReportLab 組込CIDフォントで日本語 PDF 生成。チャート画像を埋め込み |
| `koe/main.py` | CLI。単一店舗／複数店舗バッチ（`clients.yaml`）両対応。`~/Desktop/.env` 優先読込 |
| `submodules/minutes/` | 議事録自動生成（Zoom mp4 → Whisper → Claude） |
| `submodules/slides/koe_deck.py` | python-pptx で Koe 月次分析JSON → 16:9 プレゼン .pptx 生成（11スライド） |
| `submodules/slides/main.py` | Slides CLI（現時点は Koe デッキ生成のみ対応） |
| `clients.yaml.example` | 複数店舗バッチ用設定テンプレート |
| `input/sample_reviews_{march,april}.json` | 前月比較テスト用サンプル（実データなし） |

### 動作確認済み（サンプルデータ）

- 単月レポート生成: `.venv/bin/python -m koe.main --reviews-json input/sample_reviews.json --store-name "..."` → PDF + analysis.json + チャート
- 前月比較: 3月→4月サンプルで `★Δ=+0.5 (3.60→4.10)` を検出、trend セクション内で解消論点3件／新出論点1件を正しく峻別
- スライド生成: 同じ analysis.json から `review_deck.pptx`（11スライド、86KB）を生成

### 実 API 疎通は未実施（次回セッション）

- Google Places API キーは `~/Desktop/.env` に未設定（`GOOGLE_PLACES_API_KEY` 追記が必要）
- ユーザーが自身で疎通テスト予定

### 月次自動実行（cron 例・READMEに記載済み）

```cron
0 9 1 * * cd ~/Desktop/WEBDEV_AGENCY/services/koe && .venv/bin/python -m koe.main --config clients.yaml >> output/cron.log 2>&1
```

### ドキュメント更新

- `CLAUDE.md`: 事業目標直下に「サービスラインナップ」表を追加。Web制作成約時は Koe（月¥20K）を必ず提案するルール明記
- `services/README.md`（新規）: サービス総覧＋月商シミュレーション
- `services/koe/README.md`（新規）: セールストーク・使い方・運用注意・次のステップ

### 次セッションのアクション

1. **Slides #1 実装**: Scout Agent 出力のリード情報から HNH 営業用提案スライド（.pptx）を自動生成。`submodules/slides/` 配下に `sales_deck.py` を追加
2. **README/docs 更新**: サービス追加に伴う全体ドキュメント整備（`services/koe/README.md` への slides モジュール使い方追記など）
3. **Koe 本番疎通テスト**: `~/Desktop/.env` に `GOOGLE_PLACES_API_KEY` 追加後、実店舗 place_id で動作確認。API レートリミット・レビュー取得上限（5件）の実挙動検証

### 既知の技術メモ

- Python 3.9 環境のため、型注釈で `X | None` を使う場合は各ファイル先頭に `from __future__ import annotations` 必須
- Places API (New) v1 は 1 リクエストで返るレビュー最大 5 件。長期トレンドには `output/snapshots/` の月次蓄積が前提
- venv は `services/koe/.venv`（`services/koe/` 配下で完結）

---

## 🆕 2026-04-10 追加アセット（企業向けリード拡張）

本日追加した企業向け営業アセット（Places API枠切れ対応）：

### Web検索・手動ベース
| ファイル | 用途 |
|---|---|
| `campaigns/direct_outreach/corporate_email_template.md` | 企業向け営業メール（4パターン: A完全HP無し/B採用中/Cリデザイン/D士業向け） |
| `scripts/auto_pipeline/scout_websearch.js` | Web検索ベースでリードを発掘 → JSONで受け取りCSV追記するフレームワーク |
| `campaigns/direct_outreach/lead_sources_corporate.md` | 企業向けリード発掘ガイド（Instagram・Indeed・法人番号公表サイト等） |
| `campaigns/direct_outreach/wantedly_manual_guide.md` | Wantedly手動リード発掘ガイド（ToS遵守、企業発見→Google経由連絡先取得） |

### 法人番号API連携（新設法人リード自動取得）
| ファイル | 用途 |
|---|---|
| `scripts/auto_pipeline/safety.js` | 全スクリプト共通のAPI安全管理モジュール（日次制限・月次コスト上限・ALLOW_PAIDフラグ） |
| `scripts/auto_pipeline/scout_houjin.js` | 国税庁法人番号APIから東京都の新設法人を自動取得 |
| `logs/houjin_api_usage.json` | 法人番号API日次カウンター（自動生成） |
| `logs/google_search_usage.json` | Google検索日次カウンター（自動生成） |
| `logs/monthly_api_costs.json` | 月間API総コスト管理（自動生成） |

### セーフティ設計
- 法人番号API: 日次100件上限、無料（申請必要）
- Google Custom Search: 日次50件上限、$5/1000 queries、ALLOW_PAID=true必須、最小5秒間隔
- 月間API総コスト上限: **$200（全API合算）** — 超えたら全スクリプト停止
- デフォルト: `ALLOW_PAID=false`（有料APIは明示的許可が必要）

### 実行コマンド
```bash
# 法人番号APIで東京の直近90日の新設法人を取得（HP確認なし）
npm run scout:houjin

# 直近30日のみ
node scripts/auto_pipeline/scout_houjin.js --days 30

# 手動ダウンロードCSVから取り込み（App ID未取得時）
node scripts/auto_pipeline/scout_houjin.js --csv ~/Downloads/houjin.csv

# HP自動確認モード（要 ALLOW_PAID=true + Google Custom Search API）
ALLOW_PAID=true node scripts/auto_pipeline/scout_houjin.js --verify-hp

# ドライラン
npm run scout:houjin:dry
```

**次アクション**:
1. **即日**: 国税庁法人番号API App ID 申請 (https://www.houjin-bangou.nta.go.jp/webapi/) — 発行まで2週〜1ヶ月
2. **即日**: https://www.houjin-bangou.nta.go.jp/download/ から月次CSVダウンロード → `npm run scout:houjin -- --csv <path>` で今日から使える
3. **即日**: `wantedly_manual_guide.md` に従ってWantedly手動ブラウズ（1セット15分）
4. **4/29以降**: Google Places API枠リセット → 既存scout.jsで企業向け業種を一気に収集

---

## 1. 営業実績（累計）

| チャネル | 送信数 | 返信数 | 成約数 |
|---|---|---|---|
| メール | 13件（うち送信失敗1件） | 0 | 0 |
| Instagram DM | **60件** | 0 | 0 |
| **合計** | **73件** | 0 | 0 |

### 2026-04-10 の実績
- DM 31〜60件目 送信完了（+30件）
- dm_send_list.md の31〜60をチェック済み
- target_list.csv のステータスを dm_sent に更新

### 2026-04-09 の実績
- メール13件 + DM 30件 = 43件

---

## 2. パイプライン現状

| 指標 | 数値 |
|---|---|
| 総リード数 | 746 |
| HPあり（営業対象外） | 22 |
| リデザイン対象（HP有・低品質） | 2 |
| SSL非対応（HP有・要改善） | 1 |
| アクティブリード（HP無し） | 717 |
| **送信済み（メール）** | **11件** |
| **送信済み（DM）** | **60件** |
| 未送信 | 650件 |

**残り送信可能リード:**
- Instagram DM: 89件（149件中60件送信済み）
- メール: 2件（15件中13件送信済み）
- リデザイン提案: 3件（HP品質スコア5以下）+ 26件（その他HP有り、未スコアリング）
- 電話営業: 550+件（将来チャネル）

---

## 3. 本日作成・更新したアセット

### コミット履歴（本日3コミット）

1. **`59ee2d0`** — 営業実績ログ（dashboard.md + target_list.csv 41行更新）
2. **`83aa867`** — CLAUDE.md 新規追跡 + `# 重要ルール`セクション追加
3. **`b4b19b8`** — KISSA RAYメール + GSC手順書 + プラットフォーム3種

### 新規ファイル

| ファイル | 用途 |
|---|---|
| `STATUS.md`（このファイル） | プロジェクト現状サマリー |
| `docs/google_search_console_setup.md` | 自社サイトSEO強化手順書（hnh-design-works.vercel.app向け） |
| `campaigns/platforms/jimoty.md` | ジモティー出品テキスト |
| `campaigns/platforms/crowdworks.md` | クラウドワークス プロフィール＆応募テンプレ |
| `campaigns/platforms/lancers.md` | ランサーズ プロフィール＆応募テンプレ |
| `campaigns/direct_outreach/email_queue/2026-04-09_06_kissaray.json` | KISSA RAY向け個別リデザイン提案メール（要送信） |

---

## 4. 明日（2026-04-10）以降のアクション

### 即実行可能（準備済み）

- [ ] **DM送信31〜60件目（30件）** — `dm_send_list.md` にテンプレ生成済み、コピペで送信可能
  - 31〜35: 恵比寿エリア（284, amme, 炭焼炉端テント, 善菜ZENNA, 手羽先むつみ）
  - 36〜41: 新宿エリア（中華そば流川, 鈴蘭, 百日紅, 酒場つむぎ堂, かきび, らぁ麺嶋）
  - 42〜47: 浅草エリア（串焼バル1.2.3, 呑みやしき209, ASA虎, もつ焼のんき, 浅草酒場岡本, 花本）
  - 48〜60: 渋谷エリア（soba MAREN, うさぎ, まぜそば七, ほか）
- [ ] **KISSA RAYメール送信** — `email_queue/2026-04-09_06_kissaray.json`（個別カスタマイズ済み、status="queued"）
- [ ] **メール残り2件送信** — 名前不明、`target_list.csv` で `$4!="" && $11=="未送信"` で抽出可能

### ココナラ出品

- [ ] **`coconala_listing.md` をココナラに出品** — 内容は完成済み、修正不要。Premium ¥20万先着5社キャンペーンが目玉

### 無料営業チャネル開拓

- [ ] **ジモティー出品** — `campaigns/platforms/jimoty.md` の本文をコピペで出品。地域は「東京都」全域、3日に1回再投稿
- [ ] **クラウドワークス登録 + プロフィール設定** — `campaigns/platforms/crowdworks.md` のプロフィール文を流用
- [ ] **ランサーズ登録 + プロフィール設定** — `campaigns/platforms/lancers.md` のプロフィール文を流用

### 自社サイト SEO

- [ ] **Google Search Console 登録** — `docs/google_search_console_setup.md` の手順書に従う（所要約30分）
- [ ] 主要7ページのインデックス登録リクエスト
- [ ] サイトマップ送信（`sitemap.xml` は既に公開済み）

### スコープ拡大候補

- [ ] **HP有り22件のバルクHP audit** — 現状スコアリングは3件のみ。残り19件をスコアリングすれば、リデザイン提案メールの候補が増える（KISSA RAYのように6〜8点が出れば追加メール送信可能）
- [ ] **メール送信失敗1件の特定** — `send_log.csv` を再確認、または送信スクリプトのログを精査

---

## 5. 既知の問題・注意事項

### CSV関連

- **`target_list.csv` の HP品質スコアは3件のみ記録**: 残りのHP有り店舗（22件）はスコアリング未実施。リデザイン提案候補の発掘に支障あり
- **CRLF/LF混在**: HEAD のCSVはCRLF170行+LF577行の混在状態。今後Pythonで編集する場合はバイト単位で改行を保持する書き方が必要（`/tmp/update_dm_v2.py` 参照）
- **`喫茶ネグラ` の二重送信**: 本日メール送信(送信済み) + DM送信(dm_sent)の両方を実施。CSV上は最新のdm_sentに上書きされたが、メール履歴は `send_log.csv` に残っている

### 命名・運用

- **`hnh.designworks@gmail.com`** が公式メールアドレス（メール署名に使用）
- **送信者名**: Naoya Toyokawa（豊川 直也）
- **屋号**: HNH Design Works
- **ポートフォリオURL**: https://hnh-design-works.vercel.app
- **申込フォーム**: https://hnh-design-works.vercel.app/intake.html

### API予算

- **2026年4月のGoogle Places API使用状況**: $195.94 / $200（残り$4.06）
- **新規リード追加には予算追加が必要**（あと数日で月次リセット）

---

## 6. ファイル構造クイックリファレンス

```
WEBDEV_AGENCY/
├── CLAUDE.md                            # チーム編成・実行ルール（必読）
├── STATUS.md                            # 本ファイル（必読）
├── index.html, intake.html, demo_*.html # 自社サイト
├── sitemap.xml, robots.txt              # SEO
├── services/                            # 🆕 サブサービスライン
│   ├── README.md                        # サービス総覧・月商シミュレーション
│   └── koe/                             # Koe（月次レビュー分析 ¥20K/月）
│       ├── README.md
│       ├── koe/                         # メインパッケージ
│       ├── submodules/
│       │   ├── minutes/                 # 議事録自動生成
│       │   └── slides/                  # スライド生成（Koeデッキ対応済）
│       ├── clients.yaml.example
│       ├── input/, output/              # 入出力（gitignore）
│       └── .venv/                       # Python 仮想環境
├── docs/
│   └── google_search_console_setup.md   # GSC手順書
├── campaigns/
│   ├── coconala_listing.md              # ココナラ出品テキスト
│   ├── instagram_profile.md             # Instagram運用
│   ├── outreach_templates.md            # 営業テンプレ
│   ├── platforms/                       # 営業チャネル別テキスト
│   │   ├── jimoty.md
│   │   ├── crowdworks.md
│   │   └── lancers.md
│   ├── direct_outreach/                 # 直接営業
│   │   ├── dashboard.md                 # 営業ダッシュボード
│   │   ├── target_list.csv              # リードDB（746件）
│   │   ├── dm_send_list.md              # DM送信リスト（135件）
│   │   ├── send_log.csv                 # 送信ログ
│   │   ├── email_templates.md
│   │   ├── email_queue/                 # 送信予定メールキュー
│   │   ├── instagram_dm_templates.md
│   │   ├── redesign_emails.md
│   │   └── redesign_template.md
│   └── 2026-04-07_東京_飲食店/          # 過去の試験キャンペーン
└── scripts/
    └── auto_pipeline/                   # 自動化スクリプト
```

---

## 7. 担当エージェントの目安（CLAUDE.md 重要ルール #4 用）

| タスク種別 | 担当エージェント |
|---|---|
| リード発掘・スクレイピング | Scout Agent |
| デザイン・モックアップ・HP audit | Designer Agent |
| 営業メール作成 | Copywriter Agent |
| 品質チェック・レビュー | Critic |
| ステータス管理・ダッシュボード更新 | Sales Tracker |

複数エージェントの視点が必要な場合は、各視点で順に検討してから結論を出すこと（CLAUDE.md 重要ルール #3）。

---

*このSTATUS.mdは作業終了時に更新する。次セッション開始時に CLAUDE.md と一緒に必読。*

---

## 実行待ちタスク（オーナー手作業）
**棚卸し日**: 2026-04-13

| # | タスク | プロジェクト | 所要時間 | 準備状況 | 滞留日数 |
|---|---|---|---|---|---:|
| 1 | ココナラ 出品 (HNH Design Works) | HNH | 15分 | 出品文テキスト準備済 | 未測定 |
| 2 | 進行中リード 返信2件 フォローアップ | HNH | 10分 | 返信テンプレ済 | 未測定 |

件数: **2 / 5**
