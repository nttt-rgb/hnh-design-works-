#!/bin/bash
# schedule.sh — パイプライン自動実行スクリプト
# 毎日午前10時に実行（営業メールに最適な時間帯）
#
# crontab設定:
#   crontab -e で以下を追加:
#   0 10 * * * /Users/naoya/Desktop/WEBDEV_AGENCY/scripts/auto_pipeline/schedule.sh
#
# ドライラン（テスト用）:
#   0 10 * * * /Users/naoya/Desktop/WEBDEV_AGENCY/scripts/auto_pipeline/schedule.sh --dry-run

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

# Node.jsのパスを確保
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "=== Pipeline run: $(date) ===" >> "$LOG_DIR/pipeline.log"
node "$SCRIPT_DIR/pipeline.js" "$@" >> "$LOG_DIR/pipeline.log" 2>&1
echo "=== Pipeline end: $(date) ===" >> "$LOG_DIR/pipeline.log"
