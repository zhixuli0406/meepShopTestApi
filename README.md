# MeepShop 聊天室 API 服務

這是一個聊天應用程式的後端 API 服務，使用 Node.js、Koa.js 和 MongoDB 建置。它支援文字與圖片訊息（圖片儲存於 AWS S3），並透過 WebSockets 進行即時通訊。

## 目錄

- [MeepShop 聊天室 API 服務](#meepshop-聊天室-api-服務)
  - [目錄](#目錄)
  - [功能特性](#功能特性)
  - [系統需求](#系統需求)
  - [開始使用](#開始使用)
    - [安裝步驟](#安裝步驟)
    - [環境變數設定](#環境變數設定)
    - [執行應用程式](#執行應用程式)
  - [API 端點說明](#api-端點說明)
    - [通用回應格式](#通用回應格式)
      - [成功回應](#成功回應)
      - [錯誤回應](#錯誤回應)
    - [使用者管理](#使用者管理)
      - [`POST /users` (建立使用者)](#post-users-建立使用者)
    - [對話管理](#對話管理)
      - [`POST /conversations` (建立對話)](#post-conversations-建立對話)
      - [`GET /conversations` (取得所有對話列表)](#get-conversations-取得所有對話列表)
    - [訊息管理](#訊息管理)
      - [`GET /conversations/:conversationId/messages` (取得特定對話的訊息)](#get-conversationsconversationidmessages-取得特定對話的訊息)
      - [`POST /conversations/:conversationId/messages` (在特定對話中建立新訊息)](#post-conversationsconversationidmessages-在特定對話中建立新訊息)
    - [檔案上傳 (S3 預簽名 URL)](#檔案上傳-s3-預簽名-url)
      - [`POST /uploads/generate-signed-url` (產生 S3 預簽名上傳 URL)](#post-uploadsgenerate-signed-url-產生-s3-預簽名上傳-url)
  - [WebSocket API](#websocket-api)
    - [事件](#事件)
      - [客戶端 -\> 伺服器](#客戶端---伺服器)
      - [伺服器 -\> 客戶端](#伺服器---客戶端)
  - [初始資料載入](#初始資料載入)
  - [專案結構](#專案結構)
  - [待辦事項／未來增強功能](#待辦事項未來增強功能)
  - [資料模型 (建議)](#資料模型-建議)
  - [API 端點 (HTTP)](#api-端點-http)
  - [WebSocket 事件 (建議)](#websocket-事件-建議)
  - [初始資料載入](#初始資料載入-1)
  - [設定與執行 (預留位置)](#設定與執行-預留位置)
  - [專案結構 (建議)](#專案結構-建議)

## 功能特性

- 建立使用者
- 建立使用者之間的對話
- 發送與接收文字訊息
- 發送與接收圖片訊息 (透過預簽名 URL 上傳至 AWS S3)
- 透過 WebSockets (Socket.IO) 進行即時訊息廣播
- 從 `chat_data.json` 載入初始資料以便快速設定

## 系統需求

- Node.js (建議 v16 或更新版本)
- npm 或 yarn
- MongoDB (本機執行個體或雲端服務，如 MongoDB Atlas)
- AWS S3 儲存桶 (Bucket) 以及具有 S3 寫入權限的 IAM 憑證

## 開始使用

### 安裝步驟

1.  複製專案儲存庫：
    ```bash
    git clone <您的專案儲存庫 URL>
    cd meepShopTestApi
    ```
2.  安裝依賴套件：
    ```bash
    npm install
    ```

### 環境變數設定

在專案根目錄下建立一個名為 `.env` 的檔案，並加入以下變數，請將預留位置的值替換成您實際的設定：

```env
# MongoDB 設定
MONGO_URI=mongodb://localhost:27017/meepshop_chat_app

# AWS S3 設定
AWS_ACCESS_KEY_ID=您的_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=您的_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=您用於聊天服務的_S3_儲存桶名稱
AWS_REGION=您的_AWS_S3_儲存桶所在區域

# 伺服器設定
PORT=3000
CLIENT_URL=http://localhost:8080 # 您的前端應用程式 URL (用於 CORS 設定)

# 初始資料載入 (設定為 true 可在啟動時從 chat_data.json 載入資料)
LOAD_INITIAL_DATA=true

# JWT 金鑰 (供未來身份驗證實作使用)
# JWT_SECRET=您極度機密的_JWT_金鑰_用於聊天應用程式
# JWT_EXPIRES_IN=1d
```
**重要提示：** 請將 `.env` 檔案加入到您的 `.gitignore` 設定中，以避免提交敏感的憑證資訊。

### 執行應用程式

```bash
npm start
```
此指令將啟動 Koa 伺服器。如果 `LOAD_INITIAL_DATA` 設定為 `true`，且為首次執行（或資料庫為空），系統將嘗試從 `chat_data.json` 載入初始的使用者、對話及訊息資料。

## API 端點說明

### 通用回應格式

#### 成功回應

大多數成功的 GET (單一資源)、POST 和 PUT 請求將返回一個 `200 OK` 或 `201 Created` 狀態，其回應主體 (body) 格式如下：

```json
{
  "status": "success",
  "data": {
    // ... 資源物件 ...
  }
}
```

對於返回資源列表的成功 GET 請求 (例如：`/conversations`)，`data` 欄位將是一個陣列：

```json
{
  "status": "success",
  "data": [
    // ... 資源物件陣列 ...
  ]
}
```
某些成功的操作可能在 `status` 和 `data` 之外，還包含一個 `message` 欄位。

#### 錯誤回應

所有錯誤回應都將遵循標準化的格式：

```json
{
  "status": "fail", // 用於客戶端錯誤 (4xx)
  // 或
  "status": "error", // 用於伺服器端錯誤 (5xx)
  "message": "描述性的錯誤訊息。",
  "errorCode": "可選的錯誤代碼", // 用於程式化錯誤處理的特定代碼
  "details": [ // 可選：包含更詳細錯誤資訊的陣列或物件 (例如：驗證錯誤)
    {
      "field": "欄位名稱",
      "message": "針對此欄位的特定驗證訊息"
    }
  ]
}
```

常見的 `errorCode` 值包括：
- `VALIDATION_ERROR`: 輸入驗證失敗 (請檢查 `details` 以獲得具體資訊)。
- `NOT_FOUND`: 找不到請求的資源。
- `CONVERSATION_NOT_FOUND`: 找不到指定的對話。
- `USER_NOT_FOUND`: 找不到指定的使用者。
- `UNAUTHORIZED`: 需要身份驗證，但驗證失敗或尚未提供。
- `FORBIDDEN`: 已驗證的使用者無權執行此操作。
- `SENDER_NOT_PARTICIPANT`: 訊息發送者並非此對話的參與者。
- `USERNAME_TAKEN`:請求的使用者名稱已被使用。
- `DUPLICATE_KEY`: 違反了唯一欄位約束 (例如，試圖創建一個必須是唯一的資源)。
- `INSUFFICIENT_UNIQUE_PARTICIPANTS`: 對話至少需要兩名不重複的有效參與者。
- `S3_ERROR`: S3 操作過程中發生錯誤。
- `INTERNAL_SERVER_ERROR`: 通用伺服器錯誤。

`details` 欄位，特別是對於 `VALIDATION_ERROR`，將提供關於哪些欄位驗證失敗及其原因的具體資訊。

### 使用者管理

#### `POST /users` (建立使用者)

建立一個新的使用者。

-   **方法：** `POST`
-   **端點：** `/users`
-   **請求主體 (Request Body)：**
    ```json
    {
      "username": "字串 (英數字元, 3-30 字元, 必填)",
      "avatar": "字串 (有效的 URI, 選填)"
    }
    ```
-   **成功回應：** `201 Created`
    ```json
    {
      "status": "success",
      "data": {
        "_id": "使用者ID",
        "username": "字串",
        "avatar": "字串 (URL)",
        "createdAt": "時間戳記"
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：缺少使用者名稱、格式無效)。 `errorCode: VALIDATION_ERROR`。
        ```json
        {
            "status": "fail",
            "message": "輸入驗證失敗。",
            "errorCode": "VALIDATION_ERROR",
            "details": [
                {
                    "message": "使用者名稱為必填欄位",
                    "field": "username"
                }
            ]
        }
        ```
    -   `409 Conflict`: 使用者名稱已存在。 `errorCode: USERNAME_TAKEN`。
        ```json
        {
            "status": "fail",
            "message": "使用者名稱已存在。",
            "errorCode": "USERNAME_TAKEN"
        }
        ```

### 對話管理

#### `POST /conversations` (建立對話)

在兩位或多位使用者之間建立一個新的對話。如果已存在具有完全相同參與者組合的對話，則返回現有的對話。

-   **方法：** `POST`
-   **端點：** `/conversations`
-   **請求主體 (Request Body)：**
    ```json
    {
      "participantIds": ["使用者ID1 (ObjectId 字串, 必填)", "使用者ID2 (ObjectId 字串, 必填)", "... (至少 2 位)"]
    }
    ```
-   **成功回應 (新對話)：** `201 Created`
    ```json
    {
      "status": "success",
      "data": {
        "_id": "對話ID",
        "participants": [
          { "userId": "id", "user": "使用者名稱1", "avatar": "頭像URL1" },
          { "userId": "id", "user": "使用者名稱2", "avatar": "頭像URL2" }
        ],
        "lastMessage": null,
        "createdAt": "時間戳記",
        "updatedAt": "時間戳記"
      }
    }
    ```
-   **成功回應 (現有對話)：** `200 OK`
    ```json
    {
      "status": "success",
      "message": "具有這些參與者的對話已存在。",
      "data": {
        "_id": "對話ID",
        "participants": [
          { "userId": "id", "user": "使用者名稱1", "avatar": "頭像URL1" },
          { "userId": "id", "user": "使用者名稱2", "avatar": "頭像URL2" }
        ],
        "lastMessage": "最後一則訊息ID_或_null", // 或已填充的訊息物件
        "createdAt": "時間戳記",
        "updatedAt": "時間戳記"
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：無效的參與者 ID、參與者數量不足)。 `errorCode: VALIDATION_ERROR` 或 `INSUFFICIENT_UNIQUE_PARTICIPANTS`。
    -   `404 Not Found`: 一或多位參與者使用者未找到。 `errorCode: USER_NOT_FOUND`。

#### `GET /conversations` (取得所有對話列表)

擷取所有對話的列表，依照最近更新時間排序。包含參與者詳細資訊和最後一則訊息內容。

-   **方法：** `GET`
-   **端點：** `/conversations`
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "對話ID1",
          "participants": [
            { "userId": "id1", "user": "使用者名稱1", "avatar": "頭像URL1" },
            { "userId": "id2", "user": "使用者名稱2", "avatar": "頭像URL2" }
          ],
          "lastMessage": "最後一則訊息的內容或 [圖片]",
          "timestamp": 1678886400000 // 最後更新的 Unix 毫秒時間戳記
        }
        // ... 更多對話
      ]
    }
    ```
-   **錯誤回應：**
    -   `500 Internal Server Error`: 如果擷取對話時發生問題。

### 訊息管理

#### `GET /conversations/:conversationId/messages` (取得特定對話的訊息)

擷取特定對話中的所有訊息，依照建立時間排序。

-   **方法：** `GET`
-   **端點：** `/conversations/:conversationId/messages`
-   **URL 參數：**
    -   `conversationId` (字串, 有效的 MongoDB ObjectId, 必填)
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "data": [
        {
          "id": "訊息ID",
          "conversationId": "對話ID",
          "sender": {
            "userId": "發送者使用者ID",
            "user": "發送者使用者名稱",
            "avatar": "發送者頭像URL"
          },
          "type": "text" | "image" | "system",
          "content": "訊息內容或圖片 URL",
          "s3Key": "S3 物件金鑰 (若為圖片類型，選填)",
          "timestamp": 1678886400000 // Unix 毫秒時間戳記
        }
        // ... 更多訊息
      ]
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 無效的 `conversationId` 格式。 `errorCode: VALIDATION_ERROR`。
    -   `404 Not Found`: 找不到對話。 `errorCode: CONVERSATION_NOT_FOUND`。
    -   **注意：** 將新增授權機制，以確保只有對話參與者可以存取訊息。

#### `POST /conversations/:conversationId/messages` (在特定對話中建立新訊息)

向特定對話發送一則新訊息。訊息隨後會透過 WebSockets 廣播給該對話聊天室中已連線的客戶端。

-   **方法：** `POST`
-   **端點：** `/conversations/:conversationId/messages`
-   **URL 參數：**
    -   `conversationId` (字串, 有效的 MongoDB ObjectId, 必填)
-   **請求主體 (Request Body)：**
    ```json
    {
      "senderId": "使用者ID (ObjectId 字串, 必填)",
      "type": "text" | "image" (字串, 必填),
      "content": "字串 (若類型為 'text' 則為訊息文字，若類型為 'image' 則為 S3 URL, 必填)",
      "s3Key": "字串 (S3 物件金鑰, 若類型為 'image' 則必填，否則為 null/省略)"
    }
    ```
-   **成功回應：** `201 Created`
    ```json
    {
      "status": "success",
      "data": {
        "id": "訊息ID",
        "conversationId": "對話ID",
        "sender": {
          "userId": "發送者使用者ID",
          "user": "發送者使用者名稱",
          "avatar": "發送者頭像URL"
        },
        "type": "text" | "image",
        "content": "訊息內容或圖片 URL",
        "s3Key": "S3 物件金鑰或 null",
        "timestamp": 1678886400000 // Unix 毫秒時間戳記
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: `conversationId` 或請求主體驗證錯誤。 `errorCode: VALIDATION_ERROR`。
    -   `403 Forbidden`: 發送者並非此對話的參與者。 `errorCode: SENDER_NOT_PARTICIPANT`。
    -   `404 Not Found`: 找不到對話或發送者。 `errorCode: CONVERSATION_NOT_FOUND` 或 `USER_NOT_FOUND`。

### 檔案上傳 (S3 預簽名 URL)

此流程允許客戶端使用由伺服器產生的預簽名 URL，直接將檔案上傳到 AWS S3。

#### `POST /uploads/generate-signed-url` (產生 S3 預簽名上傳 URL)

產生一個預簽名 URL，客戶端可以使用該 URL 將檔案（例如：圖片）直接上傳到 AWS S3。

-   **方法：** `POST`
-   **端點：** `/uploads/generate-signed-url`
-   **請求主體 (Request Body)：**
    ```json
    {
      "filename": "字串 (例如：image.jpg, 必填)",
      "contentType": "字串 (例如：image/jpeg, 必填)",
      "userId": "字串 (選填, 用於組織 S3 路徑)",
      "conversationId": "字串 (選填, 用於組織 S3 路徑)"
    }
    ```
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "data": {
        "signedUrl": "S3_預簽名_PUT_url",
        "objectKey": "您在S3上的檔案路徑/檔案名稱.jpg",
        "fileUrl": "檔案成功上傳後的公開URL.jpg"
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：缺少檔案名稱或內容類型)。 `errorCode: VALIDATION_ERROR`。
    -   `500 Internal Server Error`: 如果 S3 設定遺失或產生 URL 時發生錯誤。 `errorCode` 可能是 `S3_ERROR` 或通用的伺服器錯誤代碼。

## WebSocket API

WebSocket API 用於即時通訊，主要用於向已連線的客戶端廣播新訊息。

-   **伺服器 URL：** Socket.IO 伺服器與 HTTP 伺服器在相同的連接埠上執行 (例如：`ws://localhost:3000` 或 `wss://yourdomain.com`)。

### 事件

#### 客戶端 -> 伺服器

1.  **`joinConversation`**
    -   **酬載 (Payload)：** `conversationId (字串)`
    -   **描述：** 當使用者進入特定對話畫面時由客戶端發送。伺服器會將客戶端的 socket 加入到由 `conversationId` 標識的聊天室中。
    -   **範例 (客戶端 JavaScript)：**
        ```javascript
        socket.emit('joinConversation', '您的_對話ID');
        ```

2.  **`leaveConversation`** (選填)
    -   **酬載 (Payload)：** `conversationId (字串)`
    -   **描述：** 當使用者離開特定對話畫面時由客戶端發送。伺服器會將客戶端的 socket 從該聊天室中移除。
    -   **範例 (客戶端 JavaScript)：**
        ```javascript
        socket.emit('leaveConversation', '您的_對話ID');
        ```

#### 伺服器 -> 客戶端

1.  **`newMessage`**
    -   **酬載 (Payload)：** `訊息物件 (Object)`
        ```json
        // 與 POST /conversations/:conversationId/messages 成功回應的 data 部分結構相同
        {
          "id": "訊息ID",
          "conversationId": "對話ID",
          "sender": {
            "userId": "發送者使用者ID",
            "user": "發送者使用者名稱",
            "avatar": "發送者頭像URL"
          },
          "type": "text" | "image",
          "content": "訊息內容或圖片 URL",
          "s3Key": "S3 物件金鑰或 null",
          "timestamp": 1678886400000 // Unix 毫秒時間戳記
        }
        ```
    -   **描述：** 當特定對話中成功建立新訊息時 (透過 HTTP POST API)，由伺服器向該對話聊天室中的所有客戶端廣播。
    -   **範例 (客戶端 JavaScript)：**
        ```javascript
        socket.on('newMessage', (messageData) => {
          console.log('收到新訊息：', messageData);
          // 更新 UI 以顯示新訊息
        });
        ```

## 初始資料載入

如果 `LOAD_INITIAL_DATA` 環境變數設定為 `true`，應用程式將在啟動時嘗試從 `chat_data.json` 檔案將初始資料載入到 MongoDB 資料庫中。這對於開發和測試非常有用。

該指令碼 (`src/initialLoad.js`) 將執行以下操作：
1.  根據使用者名稱檢查 `chat_data.json` 中的使用者是否已存在。如果不存在，則建立它們。
2.  根據參與者使用者名稱檢查 `chat_data.json` 中的對話是否已存在。如果不存在，則使用新建立的或現有的使用者 ID 建立它們。
3.  將 `chat_data.json` 中的訊息匯入到各自的對話中，並將它們與正確的發送者使用者 ID 和對話 ID 關聯起來。

此過程設計為在可能的情況下具有冪等性（例如，如果使用者或對話已匹配，則不會建立重複的項目）。

## 專案結構

```
/meepShopTestApi
├── src/
│   ├── api/                # Koa 路由
│   │   ├── userRoutes.js
│   │   ├── conversationRoutes.js
│   │   └── messageRoutes.js
│   │   └── uploadRoutes.js
│   ├── controllers/        # 路由處理器 (業務邏輯)
│   │   ├── userController.js
│   │   ├── conversationController.js
│   │   ├── messageController.js
│   │   └── uploadController.js
│   ├── middlewares/        # 自訂 Koa 中介軟體
│   │   └── errorHandler.js
│   ├── models/             # Mongoose 模型 (資料庫綱要)
│   │   ├── user.js
│   │   ├── conversation.js
│   │   └── message.js
│   ├── services/           # 外部服務整合 (例如：S3)
│   │   └── s3Service.js
│   ├── validators/         # Joi 驗證綱要
│   │   ├── userValidators.js
│   │   ├── conversationValidators.js
│   │   ├── messageValidators.js
│   │   └── uploadValidators.js
│   ├── config/             # 設定檔 (例如：資料庫設定)
│   │   └── database.config.js
│   ├── app.js              # Koa 應用程式設定
│   ├── database.js         # MongoDB 連線設定
│   ├── server.js           # HTTP 伺服器與 Socket.IO 設定，進入點
│   ├── socketManager.js    # Socket.IO 事件處理邏輯
│   └── initialLoad.js      # 載入初始資料的指令碼
├── .env.example          # 環境變數範例
├── .env                    # 環境變數 (由 Git 忽略)
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── chat_data.json        # 用於初始載入的範例資料
```

## 待辦事項／未來增強功能

-   **身份驗證與授權：**
    -   為使用者實作基於 JWT 的身份驗證。
    -   保護 WebSocket 連線 (在連線時傳遞權杖或透過 'authenticate' 事件)。
    -   實作健全的授權機制 (例如：確保只有對話參與者可以檢視／傳送訊息、管理對話詳細資訊等)。
-   **訊息功能：**
    -   訊息已讀回條。
    -   輸入狀態指示器。
    -   訊息表情回應 (例如：讚／愛心等)。
    -   編輯與刪除訊息。
-   **使用者功能：**
    -   使用者在線狀態。
    -   使用者搜尋。
    -   更新使用者個人資料。
-   **對話功能：**
    -   群組對話。
    -   離開對話。
    -   將對話／通知靜音。
-   **檔案上傳：**
    -   支援其他檔案類型 (文件、影片)，並進行適當的 S3 設定。
    -   如果檔案非公開，則為下載產生預簽名 URL。
-   **錯誤處理與日誌記錄：**
    -   更細緻的錯誤代碼和訊息。
    -   整合更強健的日誌記錄函式庫 (例如：Winston, Pino)。
-   **測試：**
    -   針對控制器、服務和公用程式的單元測試。
    -   針對 API 端點的整合測試。
-   **可擴展性與效能：**
    -   考慮資料庫索引以提升效能。
    -   優化查詢。
    -   探索擴展 WebSockets 的選項 (例如：用於 Socket.IO 的 Redis 適配器)。
-   **安全性強化：**
    -   API 的速率限制。
    -   驗證之外的輸入清理 (如有必要，儘管 Mongoose 和 Joi 有所幫助)。
    -   檢閱 S3 儲存桶策略以符合最小權限原則。
    -   使用 Helmet.js 或類似工具設定常見的安全性標頭。
-   **API 文件：**
    -   考慮使用 Swagger/OpenAPI 以提供互動式 API 文件。

## 資料模型 (建議)

*   **User (使用者)**
    *   `_id`: ObjectId - 使用者唯一識別碼
    *   `username`: String - 使用者名稱 (唯一, 必填)
    *   `createdAt`: Date - 建立時間

*   **Conversation (對話)**
    *   `_id`: ObjectId - 對話唯一識別碼
    *   `participants`: [ObjectId] - 參與者 ID 列表 (參照 User 模型)
    *   `lastMessage`: ObjectId - 此對話的最後一則訊息 ID (參照 Message 模型)
    *   `createdAt`: Date - 建立時間
    *   `updatedAt`: Date - 最後更新時間

*   **Message (訊息)**
    *   `_id`: ObjectId - 訊息唯一識別碼
    *   `conversationId`: ObjectId - 所屬對話 ID (參照 Conversation 模型)
    *   `senderId`: ObjectId - 發送者 ID (參照 User 模型)
    *   `type`: String - 訊息類型 ('text', 'image')
    *   `content`: String - 訊息內容 (文字內容或圖片 S3 URL)
    *   `s3Key`: String - (可選) 圖片在 S3 中的物件鍵 (object key)
    *   `createdAt`: Date - 建立時間

## API 端點 (HTTP)

*   **使用者 (Users)**
    *   `POST /users`：建立一個新的使用者 (請求 body: `{ "username": "desired_username" }`)
*   **對話 (Conversations)**
    *   `GET /conversations`：擷取所有對話列表。
    *   `POST /conversations`：建立一個新的空對話 (請求 body: `{ "participantUsernames": ["user1", "user2"] }` 或 `{ "participantIds": ["id1", "id2"] }` - 待確認)。
*   **訊息 (Messages)**
    *   `GET /conversations/:conversationId/messages`：擷取特定對話的所有訊息。
    *   `POST /conversations/:conversationId/messages`：在特定對話中建立一則新訊息（文字或圖片）。(請求 body 範例: `{ "senderId": "userId", "type": "text", "content": "Hello!" }` 或 `FormData` 包含圖片檔案及其他欄位)

## WebSocket 事件 (建議)

*   **連線 (Connection)**: 使用者連線到 WebSocket 伺服器。
*   **加入對話 (joinConversation)**: 使用者加入特定對話房間 (e.g., `socket.join(conversationId)`).
*   **新訊息 (newMessage)**: 當有新訊息時，伺服器廣播給對話中的所有參與者。
    *   Payload: `{ "conversationId": "id", "message": { ...messageObject } }`
*   **錯誤 (error)**: 傳送錯誤訊息給客戶端。

## 初始資料載入

應用程式首次執行時，將嘗試從專案根目錄下的 `chat_data.json` 檔案載入資料，並將其填入 MongoDB 資料庫。我們將分析此檔案結構以進行處理。

## 設定與執行 (預留位置)

```bash
# 安裝依賴套件
npm install

# 設定環境變數 (例如，於 .env 檔案中)
# MONGO_URI=your_mongodb_connection_string
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_S3_BUCKET_NAME=your_s3_bucket_name
# AWS_REGION=your_aws_region
# WEBSOCKET_PORT=your_websocket_port (若與 HTTP 不同)

# 執行應用程式
npm start
```

## 專案結構 (建議)

```
.
├── src/
│   ├── api/                # Koa 路由 (HTTP routes)
│   ├── sockets/            # WebSocket 事件處理
│   ├── controllers/        # HTTP 請求控制器
│   ├── models/             # Mongoose 資料模型
│   ├── services/           # 服務 (例如 S3 上傳, 資料庫操作)
│   ├── middlewares/        # Koa 中介軟體
│   ├── config/             # 設定檔
│   ├── utils/              # 工具函式
│   ├── app.js              # Koa 應用程式設定 (HTTP)
│   ├── socketManager.js    # WebSocket 伺服器設定與管理
│   ├── database.js         # MongoDB 連線設定
│   ├── initialLoad.js      # 初始資料載入邏輯
│   └── server.js           # HTTP 與 WebSocket 伺服器啟動
├── chat_data.json          # 初始聊天資料
├── .env                    # 環境變數
├── package.json
└── README.md
``` 