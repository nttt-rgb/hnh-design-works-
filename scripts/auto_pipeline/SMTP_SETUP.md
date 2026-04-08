# SMTP設定ガイド — HNH Design Works 自動メール送信

パイプラインの自動メール送信（sender.js）を有効にするための設定手順。

---

## 1. Gmailアプリパスワードの取得

### 前提条件
- Googleアカウントで**2段階認証が有効**であること

### 手順

1. **Googleアカウント設定**を開く
   - https://myaccount.google.com/ にアクセス

2. **「セキュリティ」タブ**をクリック

3. **「2段階認証プロセス」**が有効であることを確認
   - 未有効の場合は先に有効化する

4. **「2段階認証プロセス」**をクリックして詳細ページを開く

5. ページ下部の**「アプリパスワード」**をクリック
   - 表示されない場合は https://myaccount.google.com/apppasswords に直接アクセス

6. **アプリ名を入力**: `HNH Pipeline` など任意の名前

7. **「作成」**をクリック

8. **16桁のパスワード**が表示される（例: `abcd efgh ijkl mnop`）
   - これがSMTP_PASSに設定する値
   - スペースを除いて `abcdefghijklmnop` として使用

9. **このパスワードは一度しか表示されない**のでメモしておく

---

## 2. .envにSMTP設定を追加

`~/Desktop/.env` を開いて以下を追加：

```
SMTP_USER=hnhdesignworks@gmail.com
SMTP_PASS=ここに16桁のアプリパスワード
```

### 設定例

```
SMTP_USER=hnhdesignworks@gmail.com
SMTP_PASS=abcdefghijklmnop
```

---

## 3. 動作確認

### ドライラン（実際には送信しない）

```bash
cd ~/Desktop/WEBDEV_AGENCY
node scripts/auto_pipeline/pipeline.js --dry-run
```

Composerがメールを作成し、Senderが `[DRY]` 表示で送信をシミュレートします。

### 本番テスト（1通だけ送信）

1. `target_list.csv` でメールアドレスがある店舗を確認
2. `DAILY_SEND_LIMIT=1` を `.env` に設定（1通だけ送信）
3. 実行:

```bash
node scripts/auto_pipeline/pipeline.js
```

4. 送信ログを確認:

```bash
cat campaigns/direct_outreach/send_log.csv
```

5. 問題なければ `DAILY_SEND_LIMIT=50` に戻す

---

## 4. 送信設定の調整

`.env` で以下を調整可能：

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `DAILY_SEND_LIMIT` | 50 | 1日の送信上限 |
| `SEND_INTERVAL_MS` | 120000 | 送信間隔（ミリ秒）= 2分 |
| `FOLLOWUP_DAYS` | 7 | フォローアップまでの日数 |

### Gmail送信制限（参考）

| プラン | 1日の送信上限 |
|--------|------------|
| 個人Gmail | 500通/日 |
| Google Workspace | 2,000通/日 |

パイプラインのデフォルト50通/日はGmail制限内で安全です。

---

## 5. cron自動実行の設定

毎日10時に自動実行：

```bash
crontab -e
```

以下を追加：

```
0 10 * * * /Users/naoya/Desktop/WEBDEV_AGENCY/scripts/auto_pipeline/schedule.sh
```

---

## 6. トラブルシューティング

### 「SMTP verify failed」エラー
- アプリパスワードが正しいか確認
- 2段階認証が有効か確認
- SMTP_USERのメールアドレスが正しいか確認

### 「Daily limit reached」
- 1日の送信上限に達した。翌日に自動再開

### 「5 consecutive failures」
- SMTP接続に5回連続で失敗。パイプラインが自動停止
- ネットワーク接続を確認し、再実行

### メールがスパム判定される場合
- 送信間隔を長くする（SEND_INTERVAL_MS=300000 = 5分）
- 1日の送信数を減らす（DAILY_SEND_LIMIT=20）
- メール本文が短すぎないか確認

---

## 7. セキュリティ注意事項

- `.env` ファイルは **絶対にGitにコミットしない**
- `.gitignore` に `.env` が含まれていることを確認
- アプリパスワードは定期的にローテーション推奨
- 不審なアクセスがあった場合はアプリパスワードを即座に無効化
