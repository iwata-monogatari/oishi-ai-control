# AI活動報告テンプレート

各AIに作業を依頼するとき、最後にこの形式で報告させる。

```markdown
【AI活動報告】
時刻：
AI名：
作業状態：空き／作業中／確認待ち／困り中／完了／停止中
利用上限：余裕あり／上限近い／上限到達／リセット待ち／不明
リセット予定時刻：
次に使える予定時刻：
作業名：
作業内容：
困りごと：
次に必要な判断：
成果物URL：
メモ：
```

## current.json更新用

```json
{
  "ai_name": "",
  "tool": "",
  "work_status": "",
  "limit_status": "",
  "limit_detail": "",
  "reset_at": "",
  "next_available_at": "",
  "task_title": "",
  "detail": "",
  "blocker": "",
  "next_action": "",
  "output_url": "",
  "updated_at": ""
}
```

## logs/YYYY-MM-DD.json追記用

```json
{
  "datetime": "YYYY-MM-DD HH:MM",
  "ai_name": "",
  "event_type": "開始／作業中／確認待ち／困り中／完了／上限到達",
  "task_title": "",
  "detail": "",
  "blocker": "",
  "next_action": "",
  "reset_at": "",
  "output_url": "",
  "memo": ""
}
```
