# 聊天應用程式

本專案旨在建立一個即時聊天應用程式，支援文字與圖片訊息。

## 技術棧

- Node.js
- Express
- Socket.io
- MongoDB
- AWS S3 (圖片儲存)
- EC2 (伺服器部署)

## API 結構

### GET

- `/conversations`: 取得對話列表
- `/messages?conversationId={id}`: 取得指定對話的訊息

### POST

- `/conversations/:id/messages/create`: 新增訊息至指定對話 (此處原文為"新增對話"，但根據上下文應為"新增訊息至指定對話"，待確認)

## 功能需求

- 應用程式初次載入時，讀取根目錄下的 `chat_data.json` 並將資料存入 MongoDB。
- 支援文字訊息。
- 支援圖片訊息，圖片將儲存至 AWS S3。

## 架構討論大綱

1.  **資料庫模型設計**:
    *   `Conversation` 模型
    *   `Message` 模型
2.  **API 端點確認與細化**:
    *   `POST /conversations/:id/messages/create` 的確切行為。
    *   使用者認證機制 (若有需要)。
    *   建立新對話的 API 端點。
3.  **Socket.io 即時通訊機制**:
    *   訊息傳送事件 (例如：`sendMessage`)。
    *   訊息接收事件 (例如：`receiveMessage`)。
    *   上線/離線狀態事件 (若有需要)。
4.  **圖片處理流程**:
    *   客戶端圖片上傳方式。
    *   後端接收圖片、上傳至 S3 的流程。
    *   訊息中圖片 URL 的儲存與呈現。
5.  **初始資料載入**:
    *   `chat_data.json` 的詳細格式分析。
    *   資料匯入腳本的設計。
6.  **專案結構建議**:
    *   模型 (models)
    *   路由 (routes)
    *   控制器 (controllers)
    *   服務 (services)
    *   Socket 處理 (sockets)
    *   設定檔 (config)
    *   公用程式 (utils)
7.  **EC2 部署考量**:
    *   環境變數管理 (例如：資料庫連線字串、AWS 金鑰)。
    *   程序管理員 (例如：PM2)。
    *   日誌記錄。
    *   安全性群組設定。

## 接下來的步驟

我們將逐一討論上述架構大綱中的各個項目，以確立專案的具體實作細節。 