# IT 問題處理知識庫 V3

## 功能
- 問題紀錄新增、編輯、刪除
- 全文搜尋、分類、日期、收藏篩選
- 分類圖示自訂
- 卡片 / 列表顯示切換
- 圖片附件（本機 IndexedDB + Google Drive）
- JSON 匯入 / 匯出備份
- Google 試算表文字資料同步
- Google Drive 私人附件同步
- 跨電腦下載紀錄後，開啟紀錄時按需載入 Drive 圖片
- 刪除紀錄時可同步將對應 Drive 附件資料夾移至垃圾桶

## V3 升級方式（從 V2）
1. 開啟原本的 Google 試算表。
2. 開啟「擴充功能 → Apps Script」。
3. 將本專案最新版 `apps-script/Code.gs` 全部取代原程式。
4. 執行 `setup()` 一次。
5. 因 V3 新增 Google Drive 存取，Google 會要求重新授權。
6. Apps Script 選「部署 → 管理部署」，編輯原 Web App，將版本改成「新版本」後部署。
7. 回到知識庫「雲端同步」視窗，確認顯示「Drive 圖片同步後端已啟用」。
8. 第一次建議按一次「上傳全部資料與圖片」，把既有本機附件送到 Drive。

既有 `Records` / `Config` 工作表與文字資料不需要重建。V3 會自動在 `Records` 最右側加入 `attachments` 欄位。

## 新安裝設定
1. 建立一份新的 Google 試算表。
2. 開啟「擴充功能 → Apps Script」。
3. 將 `apps-script/Code.gs` 全部貼入並儲存。
4. 執行 `setup()` 一次並完成授權。
5. 執行記錄會顯示 `SYNC_KEY` 與 Drive 附件資料夾網址。
6. Apps Script 右上角選「部署 → 新增部署 → 網頁應用程式」。
7. 執行身分選「我」，存取權限選「任何人」。
8. 複製 `/exec` 結尾的 Web App 網址。
9. 回到知識庫，開啟「雲端同步」，輸入 Web App 網址與 `SYNC_KEY`。
10. 第一次先按「上傳全部資料與圖片」，之後可開啟自動同步。

## 圖片儲存方式
- 瀏覽器：保留本機預覽快取。
- Google 試算表：只保存圖片名稱、MIME type、大小與 Drive File ID。
- Google Drive：圖片檔實際存放於 `IT 問題處理知識庫附件`。
- 每筆紀錄建立自己的 `record_<id>` 子資料夾。
- Drive 圖片不會自動改成「知道連結的人皆可查看」。
- 前端需要正確的 Web App 網址與 `SYNC_KEY` 才能透過 Apps Script 讀取附件。

## 限制
- 每筆紀錄最多 5 張圖片。
- 單張圖片最大 2 MB。
- 大量圖片第一次上傳時會逐筆同步，速度會比純文字同步慢。
- JSON 備份若某張 Drive 圖片尚未在目前瀏覽器載入，備份檔會保留 Drive metadata，但不會把該圖片內容重新嵌入 JSON。

## 安全性
Web App 必須允許「任何人」存取，前端才能從 GitHub Pages 呼叫；真正資料操作仍會驗證 `SYNC_KEY`。
請勿把自己的同步金鑰寫入 GitHub 原始碼或分享給其他人。
Drive 附件維持私人權限，後端也會檢查請求的 File ID 是否位於知識庫專用附件資料夾內。
