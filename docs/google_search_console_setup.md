# Google Search Console セットアップ手順書

**対象サイト:** https://hnh-design-works.vercel.app
**目的:** 自社サイトのSEO強化、検索流入の可視化、インデックス登録の高速化
**所要時間:** 約30分（初回設定）

---

## 前提

- Googleアカウントを所持していること（推奨: `hnh.designworks@gmail.com`）
- Vercel管理画面にログインできること
- `sitemap.xml` がサイトに公開されていること（既に `https://hnh-design-works.vercel.app/sitemap.xml` で公開済み）

---

## STEP 1｜Google Search Console に登録

1. https://search.google.com/search-console/ にアクセス
2. 「今すぐ開始」をクリック
3. Googleアカウントでログイン
4. 「プロパティを追加」を選択

---

## STEP 2｜プロパティタイプを選択

以下の2種類が表示される。**「URLプレフィックス」を選択**する。

| タイプ | 説明 | 推奨度 |
|---|---|---|
| ドメイン | DNS認証が必要。サブドメイン全てカバー | × Vercelデフォルトドメインでは不可 |
| **URLプレフィックス** | 単一URL単位。複数の認証方法が選べる | ◎ |

入力するURL：
```
https://hnh-design-works.vercel.app
```

末尾のスラッシュを忘れないこと。`https` から正確に貼り付ける。

---

## STEP 3｜所有権の確認（HTMLファイルアップロード方式を推奨）

確認方法は5種類あるが、**HTMLファイルアップロード**が最も確実。

### 手順

1. Search Consoleが提示する `googleXXXXXXXXXXXX.html` をダウンロード
2. このファイルをリポジトリの `WEBDEV_AGENCY/` 直下に配置
3. Vercelに自動デプロイされるまで1〜2分待つ
4. ブラウザで `https://hnh-design-works.vercel.app/googleXXXXXXXXXXXX.html` を直接開いて表示されることを確認
5. Search Consoleの「確認」ボタンをクリック

### 代替: メタタグ方式

ファイル配置が面倒な場合、以下のメタタグを `index.html` の `<head>` 内に追加でも可：

```html
<meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXXXX" />
```

---

## STEP 4｜サイトマップの送信

所有権確認が完了したら、左メニューの「サイトマップ」を開く。

1. 「新しいサイトマップの追加」欄に以下を入力：
   ```
   sitemap.xml
   ```
2. 「送信」をクリック
3. ステータスが「成功しました」になれば完了

`robots.txt` に sitemap 行が記載済みかも確認：
```
Sitemap: https://hnh-design-works.vercel.app/sitemap.xml
```

---

## STEP 5｜主要ページのインデックス登録をリクエスト

新規サイトはGoogleが自動巡回するまで数日〜数週間かかる。手動で速める。

1. 左メニュー「URL検査」を開く
2. 検索バーに以下のURLを1つずつ入力し、それぞれ「インデックス登録をリクエスト」を実行：

| URL | 用途 |
|---|---|
| `https://hnh-design-works.vercel.app/` | トップページ |
| `https://hnh-design-works.vercel.app/intake.html` | 申込フォーム |
| `https://hnh-design-works.vercel.app/demo_sushi_kuromasa.html` | デモ1 |
| `https://hnh-design-works.vercel.app/demo_noel_hair.html` | デモ2 |
| `https://hnh-design-works.vercel.app/demo_yoga_lumiere.html` | デモ3 |
| `https://hnh-design-works.vercel.app/legal.html` | 特商法 |
| `https://hnh-design-works.vercel.app/privacy.html` | プライバシー |

※ 1日のリクエスト上限は10件程度。重要ページから順に登録する。

---

## STEP 6｜継続的にチェックすべき項目

登録後、週1回程度Search Consoleを確認する。

### 必須チェック項目

| メニュー | 見るべきポイント | 対応 |
|---|---|---|
| **検索パフォーマンス** | クリック数・表示回数・CTR・平均掲載順位 | 流入キーワードを把握 |
| **インデックス作成 > ページ** | 「インデックスに登録されていません」が出ていないか | 出ていれば原因を確認し修正 |
| **エクスペリエンス > ページエクスペリエンス** | Core Web Vitals が「良好」か | 「不良」なら改善 |
| **拡張機能 > パンくずリスト** | 構造化データのエラー | エラーがあれば修正 |
| **手動による対策** | ペナルティ通知 | 通知があれば即対応 |

---

## STEP 7｜Google Analytics 4 と連携（推奨）

GA4を導入していれば、Search Consoleと連携することで「検索キーワード→サイト内行動」を統合分析できる。

### 連携手順

1. GA4の「管理 > プロパティ設定 > プロダクトリンク > Search Console のリンク」を開く
2. 「リンク」をクリック
3. 該当のSearch Consoleプロパティを選択
4. 該当のGA4データストリーム（Web）を選択
5. 「送信」で完了

---

## トラブルシューティング

### 所有権の確認に失敗する
- HTMLファイルが正しい場所に配置されているか確認
- Vercelのデプロイが完了しているか確認（Vercel管理画面でDeployments確認）
- ブラウザキャッシュをクリアして直接URLを叩いて確認
- 数分待ってから再試行

### サイトマップが「取得できませんでした」になる
- `https://hnh-design-works.vercel.app/sitemap.xml` がブラウザで開けるか確認
- XML構文エラーがないか https://www.xml-sitemaps.com/validate-xml-sitemap.html で検証
- `robots.txt` でサイトマップURLを誤ってブロックしていないか確認

### インデックス登録リクエストが拒否される
- `noindex` メタタグが付いていないか確認
- `robots.txt` で該当ページがブロックされていないか確認
- ページのコンテンツが極端に薄くないか確認

---

## 参考リンク

- [Search Console ヘルプ](https://support.google.com/webmasters/)
- [Search Console の使い方ガイド](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Core Web Vitals について](https://web.dev/vitals/)

---

*作成日: 2026-04-09 / HNH Design Works*
