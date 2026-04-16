# HNH Design Works — エージェントチーム仕様書

**最終更新**: 2026-04-16
**対象プロジェクト**: `~/Desktop/WEBDEV_AGENCY/`

HNH Design Works の完全自動営業〜納品〜アップセルを担う **11体のエージェント** の役割・入出力・使用ツール・モデル・成果物をまとめた設計書。

`CLAUDE.md` のチーム定義を拡張し、「成約後」「月次運用」「アップセル」のフェーズまでカバーする。

---

## チーム構成サマリ

| # | エージェント | フェーズ | モデル | 主な成果物 |
|---|---|---|---|---|
| 01 | **Scout Agent** | 発掘 | sonnet | `01_Scout_leads.md` |
| 02 | **Owner Profiler** | 発掘 | sonnet | `owner_profile` JSON |
| 03 | **Designer Agent** | 発掘 | sonnet | `02_Designer_mockups.md` |
| 04 | **Copywriter Agent** | 発掘 | sonnet | `03_Copywriter_emails.md` |
| 05 | **Critic** | 発掘 | haiku | `04_Critic_review.md` |
| 06 | **Sales Tracker** | 発掘 | haiku | `05_SalesTracker_dashboard.md` |
| 07 | **Follow-up Responder** | 返信対応 | sonnet | 2nd DM テンプレ + 送信ログ |
| 08 | **Onboarding Manager** | 成約後 | sonnet | 要件定義書 + キックオフ議事録 |
| 09 | **Delivery Manager** | 納品 | sonnet | 納品チェックリスト + 公開報告 |
| 10 | **Growth Coordinator** | 運用 | sonnet | 月次 Growth Plan レポート |
| 11 | **Insight Analyst** | 運用 | haiku | Koe レビュー分析レポート |

---

## フェーズ別フロー

```
[発掘]  Scout → Owner Profiler → Designer → Copywriter → Critic → Sales Tracker
          ↓
[送信]  送信（半自動）→ 返信検知
          ↓
[返信]  Follow-up Responder（ラフ案 + 気づき + 価格）
          ↓ 成約
[受注]  Onboarding Manager（ヒアリング → 要件定義）
          ↓
[制作]  Designer / Copywriter（本番制作）
          ↓
[納品]  Delivery Manager（チェックリスト・公開支援）
          ↓ アップセル
[月次]  Growth Coordinator（月次レポート・改善施策）
              ↓
         Insight Analyst（Koe レビュー分析レポート）
```

---

## 01. Scout Agent

- **役割**: Google Places / Tavily / Playwright でホームページ未所有のビジネスを抽出
- **入力**: エリア + 業種
- **出力**: `campaigns/YYYY-MM-DD_エリア_業種/01_Scout_leads.md`
- **ツール**: Tavily（Web 検索）、Playwright（Google Maps 操作）
- **モデル**: `sonnet`
- **実装**: `scripts/auto_pipeline/scout.js`, `scout_houjin.js`, `scout_websearch.js`
- **KPI**: 1 回の実行で 10 件以上のリード抽出

## 02. Owner Profiler

- **役割**: 抽出リードに対し、オーナーの心理タイプを推定（emotional / logical / anxious / intuitive / explorer）
- **入力**: Scout 出力（ビジネス名・業種・レビュー数・評価・Instagram 等）
- **出力**: 各リードに `owner_profile` JSON を付与（primary_type / secondary_type / scores / confidence / reason）
- **ツール**: なし（ヒューリスティック + 必要に応じて Claude 判断）
- **モデル**: `sonnet`（LLM分類モード時）
- **実装**: `src/owner-profiler.js`
- **KPI**: 分類信頼度 ≥ 0.5 のリードを 80% 以上

## 03. Designer Agent

- **役割**: 初回営業時は不発。成約後、実制作時に Canva でモックアップ → HTML 化
- **入力**: リード情報 / 成約後のヒアリング結果
- **出力**: `02_Designer_mockups.md` + モックアップ画像 / 本番 HTML
- **ツール**: Canva、Figma、HTML/CSS
- **モデル**: `sonnet`
- **KPI**: 業種別テンプレート活用で初稿 1 日以内

## 04. Copywriter Agent

- **役割**: 営業 DM ・メール文・制作時のコピー全般
- **入力**: リード情報 + Owner Profiler の心理タイプ
- **出力**: `03_Copywriter_emails.md` / 本番サイトのコピー
- **ツール**: なし（LLM のみ）
- **モデル**: `sonnet`
- **実装（補助）**: `scripts/regenerate_polite.js`（既存 queued DM を新トーン適用）
- **KPI**: 返信率 ≥ 8%

## 05. Critic

- **役割**: Designer / Copywriter 成果物の品質レビュー
- **入力**: モックアップ + コピー
- **出力**: `04_Critic_review.md`（6 項目 × 100 点満点）
- **ツール**: なし
- **モデル**: `haiku`
- **差し戻し閾値**: 60 点未満は該当エージェントへ再実行指示

## 06. Sales Tracker

- **役割**: 全リード・営業メール・モックアップ・ステータスを一元管理
- **入力**: 全エージェント成果物
- **出力**: `05_SalesTracker_dashboard.md`、`send_log.csv`
- **ツール**: Filesystem
- **モデル**: `haiku`
- **実装**: `scripts/export_dms.js`, `mark_batch_sent.js`
- **KPI**: ステータス鮮度 24h 以内

## 07. Follow-up Responder

- **役割**: 1 回目 DM に返信があったリードへ 2 回目 DM を送信。ラフ案画像 + 気づき 2〜3 点 + 価格を提示
- **入力**: 返信受信通知（Instagram DM 手動トリガー想定）
- **出力**:
  - 2 回目 DM 本文（pbcopy 経由）
  - ラフ案画像（Canva 即席生成）
  - `campaigns/direct_outreach/followup_log.csv`
- **ツール**: Canva、Playwright（Instagram）
- **モデル**: `sonnet`
- **実装**: `scripts/auto_pipeline/followup.js`（既存）
- **SLA**: 返信受信から **48 時間以内** に 2 回目 DM 送信（Zeigarnik 効果維持）

## 08. Onboarding Manager

- **役割**: 成約リードに対し、要件定義・素材回収・キックオフを管理
- **入力**: 2 回目 DM 後の商談成立通知
- **出力**:
  - 要件定義書（`deliveries/{client}/requirements.md`）
  - キックオフ議事録
  - 納期カレンダー
  - 素材（画像・ロゴ・コピー素案）のチェックリスト
- **ツール**: Filesystem、Google Meet / Zoom 議事録連携（任意）
- **モデル**: `sonnet`
- **KPI**: 契約締結〜キックオフ 5 営業日以内

## 09. Delivery Manager

- **役割**: 制作完了サイトの品質チェック・公開作業・納品説明
- **入力**: Designer / Copywriter の本番制作物
- **出力**:
  - 納品チェックリスト（SEO / OGP / フォーム動作 / Lighthouse / 404 / スマホ確認）
  - 公開報告 + ドメイン・サーバー設定手順書
  - **必須**: Koe / Growth Plan の提案を納品説明フェーズで実施（CLAUDE.md の営業ルール）
- **ツール**: Lighthouse CLI、Vercel CLI、Playwright
- **モデル**: `sonnet`
- **KPI**: Lighthouse モバイル ≥ 90 / 納期厳守率 100%

## 10. Growth Coordinator

- **役割**: 納品後の Growth Plan（月 ¥30,000〜）契約クライアントに対し、月次の施策・レポート・軽微修正を管理
- **入力**: Growth Plan 契約クライアント一覧
- **出力**:
  - 月次レポート（SEO 改善・レビュー分析・投稿文制作・流入データ）
  - 実施した施策ログ
  - 翌月の優先施策提案
- **ツール**: Google Search Console API、Google Business Profile API、Insight Analyst 成果物
- **モデル**: `sonnet`
- **KPI**: 解約率 < 5% / アップセル率 ≥ 20%
- **参照**: `services/growth_plan/README.md`、`/growth.html`

## 11. Insight Analyst

- **役割**: Google レビュー（Koe サービス）を AI で分析し、月次レポートを生成
- **入力**: クライアントの Google Business Profile ID
- **出力**:
  - 月次 Koe レポート（PDF / スライド）
  - ポジ / ネガ傾向・改善ポイント・競合比較
- **ツール**: Google Places API、Anthropic Claude
- **モデル**: `haiku`（大量テキスト要約に最適）
- **実装**: `services/koe/`
- **KPI**: レポート配信 SLA: 毎月 5 営業日以内

---

## エージェント間の情報連携

- 全成果物は Markdown / JSON / CSV でファイル化し、ファイルパスで引き渡す（口頭の要約ではなく実データを使う）
- 送信履歴は `campaigns/direct_outreach/send_log.csv` に集約
- 成約後は `deliveries/{client}/` に一元化

---

## 品質ループ（CLAUDE.md 準拠）

```
Critic が 60 点未満 → 該当エージェント再実行 → 再 Critic
  ↑_________________________________________|
(全成果物 60 点以上になるまで)
```

---

## モデル選定理由

| モデル | 理由 |
|---|---|
| `sonnet` | クリエイティブ・判断・パーソナライズが必要な業務（Scout/Designer/Copywriter/Follow-up/Onboarding/Delivery/Growth） |
| `haiku` | 軽量・高速・定型処理が必要な業務（Critic/Sales Tracker/Insight Analyst） |

---

## 運用ルール（全エージェント共通）

1. **即時実行**: ユーザー指示（エリア・業種）が与えられたら確認なしで Scout から開始
2. **ファイル引き継ぎ**: 前段の出力ファイルを直接読み込む
3. **Markdown 統一**: 見出し・表・リストで構造化
4. **日本語**: 全成果物は日本語
5. **具体性**: 抽象表現を避け、ビジネス名・住所・URL 等を必ず含める
6. **既存保全**: 過去キャンペーンを上書きせず、日付+エリア+業種でフォルダ分離
7. **プライバシー**: 個人情報は営業目的のみ、成果物に不必要に記載しない
8. **法令遵守**: 特定電子メール法 / 景表法 / 薬機法（美容クリニック案件）に準拠

---

## 今後の拡張余地

- **Analytics Ops**: GA4・Search Console を自動集計し、Growth Coordinator に継続的に給餌
- **Billing Ops**: Stripe サブスクリプション管理（Growth Plan 月額請求）
- **Content Ops**: Instagram 投稿文生成（Growth Plan 含有サービス）

これらは当初 Growth Coordinator / Insight Analyst に包含しているが、負荷分散が必要になれば分離する。
