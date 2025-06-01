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
      - [`PUT /users/:userId/avatar` (更新使用者頭像)](#put-usersuseridavatar-更新使用者頭像)
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
  - [錯誤處理與驗證](#錯誤處理與驗證)
  - [專案結構](#專案結構)
  - [部署建議](#部署建議)
  - [待辦事項／未來增強功能](#待辦事項未來增強功能)

## 功能特性

- 建立使用者，並支援更新使用者頭像。
- 建立使用者之間的對話。
- 發送與接收文字訊息。
- 發送與接收圖片訊息 (透過預簽名 URL 上傳至 AWS S3，使用 AWS SDK v3)。
- 透過 WebSockets (Socket.IO) 進行即時訊息廣播。
- 從 `chat_data.json` 載入初始資料以便快速設定。
- 完善的 API 輸入驗證 (使用 Joi)。
- 標準化的錯誤回應格式。

## 系統需求

- Node.js (建議 v16 或更新版本)
- npm 或 yarn
- MongoDB (本機執行個體或雲端服務，如 MongoDB Atlas)
- AWS S3 儲存桶 (Bucket) 以及具有 S3 存取權限的 IAM 憑證 (AWS SDK v3 會自動從環境變數或 IAM 角色讀取)。

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
    (如果遇到 AWS SDK 相關模組 `MODULE_NOT_FOUND` 的錯誤，請確保已執行 `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`)

### 環境變數設定

在專案根目錄下建立一個名為 `.env` 的檔案，並加入以下變數，請將預留位置的值替換成您實際的設定：

```env
# MongoDB 設定
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority

# AWS S3 設定 (AWS SDK v3 會自動偵測環境變數或 EC2/Lambda IAM 角色)
AWS_ACCESS_KEY_ID=您的_AWS_ACCESS_KEY_ID # 若非使用 IAM 角色，則必須提供
AWS_SECRET_ACCESS_KEY=您的_AWS_SECRET_ACCESS_KEY # 若非使用 IAM 角色，則必須提供
AWS_S3_BUCKET_NAME=您用於聊天服務的_S3_儲存桶名稱
AWS_REGION=您的_AWS_S3_儲存桶所在區域

# 伺服器設定
PORT=3000
CLIENT_URL=http://localhost:8080 # 您的前端應用程式 URL (用於 CORS 和 Socket.IO 設定)
NODE_ENV=development # 設定為 'production' 以進行生產部署

# 初始資料載入 (設定為 true 可在啟動時從 chat_data.json 載入資料)
LOAD_INITIAL_DATA=false

# JWT 金鑰 (供未來身份驗證實作使用)
# JWT_SECRET=您極度機密的_JWT_金鑰_用於聊天應用程式
# JWT_EXPIRES_IN=1d
```
**重要提示：**
- 請將 `.env` 檔案加入到您的 `.gitignore` 設定中，以避免提交敏感的憑證資訊。
- 對於生產環境的 MongoDB 連線，建議使用 MongoDB Atlas 提供的完整連接字串。
- 在 AWS 生產環境 (如 EC2、ECS、Lambda) 中，建議使用 IAM 角色來授予應用程式 S3 存取權限，而非直接在 `.env` 中設定 Access Key 和 Secret Key。如果使用 IAM 角色，則無需在 `.env` 中提供 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`。

### 執行應用程式

開發模式：
```bash
npm run dev
```
此指令通常使用 `nodemon` 或類似工具啟動伺服器，以便在檔案變更時自動重啟。

生產模式 (或普通啟動)：
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
- `UNAUTHORIZED`: 需要身份驗證，但驗證失敗或尚未提供 (未來實作)。
- `FORBIDDEN`: 已驗證的使用者無權執行此操作 (未來實作，或如 S3Key 禁止用於文字訊息)。
- `SENDER_NOT_PARTICIPANT`: 訊息發送者並非此對話的參與者。
- `USERNAME_TAKEN`:請求的使用者名稱已被使用。
- `DUPLICATE_KEY`: 違反了唯一欄位約束 (例如，試圖創建一個必須是唯一的資源)。
- `MONGOOSE_ERROR`: Mongoose 操作錯誤 (如 CastError)。
- `INSUFFICIENT_UNIQUE_PARTICIPANTS`: 對話至少需要兩名不重複的有效參與者。
- `S3_ERROR`: S3 操作過程中發生錯誤 (例如，預簽名 URL 產生失敗、刪除失敗)。
- `FILE_TYPE_NOT_ALLOWED`: 上傳的檔案類型不被允許 (在 `generate-signed-url` 中檢查)。
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
      "avatar": "字串 (有效的 URI, 選填, 可為使用者提供的公開 URL 或預設值)"
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
        "avatarS3Key": null, // 初始建立時，若 avatar 是外部 URL，則此欄位為 null
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

#### `PUT /users/:userId/avatar` (更新使用者頭像)

更新特定使用者的頭像。此流程涉及前端先透過 `POST /uploads/generate-signed-url` (指定 `uploadType: 'avatar'`) 取得預簽名 URL 並將圖片上傳至 S3，然後使用此端點將 S3 URL (`avatarUrl`) 和 S3 物件金鑰 (`s3Key`) 與使用者關聯。如果使用者已有 S3 上的舊頭像，系統會嘗試刪除舊的 S3 物件。

-   **方法：** `PUT`
-   **端點：** `/users/:userId/avatar`
-   **URL 參數：**
    -   `userId` (字串, 有效的 MongoDB ObjectId, 必填)
-   **請求主體 (Request Body)：**
    ```json
    {
      "avatarUrl": "字串 (新頭像圖片在 S3 上的公開 URL, 必填)",
      "s3Key": "字串 (新頭像圖片在 S3 上的物件金鑰, 必填)"
    }
    ```
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "message": "使用者頭像更新成功。",
      "data": {
        "_id": "使用者ID",
        "username": "使用者名稱",
        "avatar": "新的頭像 URL (S3 URL)",
        "avatarS3Key": "新的 S3 物件金鑰",
        "createdAt": "時間戳記",
        "updatedAt": "時間戳記" // (假設 User 模型有 timestamps: true)
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：缺少 `avatarUrl` 或 `s3Key`，`userId` 格式無效)。 `errorCode: VALIDATION_ERROR`。
    -   `404 Not Found`: 找不到具有指定 `userId` 的使用者。 `errorCode: USER_NOT_FOUND`。
    -   `500 Internal Server Error`: S3 刪除舊頭像失敗 (但新頭像資訊已更新至資料庫) 或其他伺服器錯誤。 `errorCode: S3_ERROR` 或 `INTERNAL_SERVER_ERROR`。

### 對話管理

#### `POST /conversations` (建立對話)

建立一個新的對話。

-   **方法：** `POST`
-   **端點：** `/conversations`
-   **請求主體 (Request Body)：**
    ```json
    {
      "participants": ["使用者ID_1", "使用者ID_2"] // 至少需要兩個不重複的有效使用者 ID
    }
    ```
-   **成功回應：** `201 Created` (如果對話是新建立的) 或 `200 OK` (如果找到已存在的相同參與者對話)
    ```json
    {
      "status": "success",
      "data": {
        "_id": "對話ID",
        "participants": [/* User 物件或 ID 列表 */],
        "lastMessage": null, // 或最後一則訊息物件
        "createdAt": "時間戳記",
        "updatedAt": "時間戳記"
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：參與者數量不足、使用者 ID 無效、參與者 ID 重複)。 `errorCode: VALIDATION_ERROR` 或 `INSUFFICIENT_UNIQUE_PARTICIPANTS`。
    -   `404 Not Found`: 提供的某些參與者 ID 在資料庫中找不到。 `errorCode: USER_NOT_FOUND` (訊息中會指明)。

#### `GET /conversations` (取得所有對話列表)

取得目前資料庫中所有的對話列表，並會填充 (populate) 參與者資訊和最後一則訊息。

-   **方法：** `GET`
-   **端點：** `/conversations`
-   **請求主體 (Request Body)：** 無
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "data": [
        {
          "_id": "對話ID_1",
          "participants": [
            { "_id": "使用者ID_A", "username": "使用者A", "avatar": "URL_A" },
            { "_id": "使用者ID_B", "username": "使用者B", "avatar": "URL_B" }
          ],
          "lastMessage": {
            "_id": "訊息ID",
            "senderId": { "_id": "使用者ID_A", "username": "使用者A", "avatar": "URL_A" },
            "type": "text",
            "content": "你好！",
            "createdAt": "時間戳記"
          },
          "createdAt": "時間戳記_1",
          "updatedAt": "時間戳記_1"
        },
        // ... 其他對話 ...
      ]
    }
    ```
-   **錯誤回應：**
    -   `500 Internal Server Error`: 伺服器內部錯誤。`errorCode: INTERNAL_SERVER_ERROR`。

### 訊息管理

#### `GET /conversations/:conversationId/messages` (取得特定對話的訊息)

取得特定對話中的所有訊息，按時間順序排列，並填充 (populate) 發送者資訊。

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
          "_id": "訊息ID_1",
          "conversationId": "對話ID",
          "senderId": { "_id": "使用者ID_X", "username": "使用者X", "avatar": "URL_X" },
          "type": "text",
          "content": "這是第一則訊息。",
          "s3Key": null,
          "createdAt": "時間戳記_1"
        },
        {
          "_id": "訊息ID_2",
          "conversationId": "對話ID",
          "senderId": { "_id": "使用者ID_Y", "username": "使用者Y", "avatar": "URL_Y" },
          "type": "image",
          "content": "https://your-s3-bucket.s3.your-region.amazonaws.com/path/to/image.jpg", // 圖片的 S3 URL
          "s3Key": "path/to/image.jpg", // 圖片的 S3 物件金鑰
          "createdAt": "時間戳記_2"
        }
        // ... 其他訊息 ...
      ]
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: `conversationId` 格式無效。`errorCode: VALIDATION_ERROR`。
    -   `404 Not Found`: 找不到具有指定 `conversationId` 的對話。`errorCode: CONVERSATION_NOT_FOUND`。

#### `POST /conversations/:conversationId/messages` (在特定對話中建立新訊息)

在指定的對話中建立一則新的文字或圖片訊息。
對於圖片訊息，前端應先透過 `POST /uploads/generate-signed-url` (指定 `uploadType: 'message'`) 取得預簽名 URL 並將圖片上傳至 S3。然後，將 S3 回傳的 `fileUrl` 作為此 API 的 `content`，`objectKey` 作為 `s3Key`。

-   **方法：** `POST`
-   **端點：** `/conversations/:conversationId/messages`
-   **URL 參數：**
    -   `conversationId` (字串, 有效的 MongoDB ObjectId, 必填)
-   **請求主體 (Request Body)：**
    ```json
    {
      "senderId": "發送者使用者ID (字串, 有效的 MongoDB ObjectId, 必填)",
      "type": "字串 (enum: 'text', 'image', 必填)",
      "content": "字串 (若 type='text', 則為訊息內容; 若 type='image', 則為圖片的 S3 URL, 必填)",
      "s3Key": "字串 (若 type='image', 則為圖片的 S3 物件金鑰, 條件性必填)"
    }
    ```
-   **成功回應：** `201 Created`
    ```json
    {
      "status": "success",
      "data": {
        "_id": "新訊息ID",
        "conversationId": "對話ID",
        "senderId": { "_id": "發送者ID", "username": "發送者名稱", "avatar": "發送者頭像URL" }, // Populate sender
        "type": "訊息類型",
        "content": "訊息內容或圖片URL",
        "s3Key": "S3 物件金鑰 (若為圖片)",
        "createdAt": "時間戳記"
      }
    }
    ```
    成功建立訊息後，此訊息也會透過 WebSocket (`newMessage` 事件) 廣播到該對話的所有已連接客戶端。
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：缺少必要欄位、`type` 無效、圖片訊息缺少 `s3Key`、`conversationId` 或 `senderId` 格式無效)。 `errorCode: VALIDATION_ERROR`。
    -   `404 Not Found`: 找不到指定的對話 (`conversationId`) 或發送者 (`senderId`)。 `errorCode: CONVERSATION_NOT_FOUND` 或 `USER_NOT_FOUND`。
    -   `403 Forbidden`: 發送者 (`senderId`) 並非此對話的參與者。 `errorCode: SENDER_NOT_PARTICIPANT`。

### 檔案上傳 (S3 預簽名 URL)

#### `POST /uploads/generate-signed-url` (產生 S3 預簽名上傳 URL)

為客戶端產生一個預簽名的 AWS S3 PUT URL，允許客戶端直接將檔案上傳到 S3 儲存桶，而無需透過後端代理。

-   **用途：** 用於上傳聊天訊息中的圖片，或使用者頭像。
-   **方法：** `POST`
-   **端點：** `/uploads/generate-signed-url`
-   **請求主體 (Request Body)：**
    ```json
    {
      "fileName": "字串 (原始檔案名稱, 例如：'my-image.jpg', 必填)",
      "contentType": "字串 (檔案的 MIME 類型, 例如：'image/jpeg', 'image/png', 必填)",
      "uploadType": "字串 (enum: 'message', 'avatar', 必填, 用於決定 S3 路徑)"
    }
    ```
-   **成功回應：** `200 OK`
    ```json
    {
      "status": "success",
      "data": {
        "signedUrl": "一個包含簽名的 S3 PUT URL (客戶端應使用 PUT 方法將檔案上傳到此 URL)",
        "objectKey": "檔案在 S3 儲存桶中的唯一物件金鑰 (例如：'uploads/messages/uuid-my-image.jpg' 或 'uploads/avatars/userId-uuid-my-image.jpg')",
        "fileUrl": "檔案上傳成功後在 S3 上的公開存取 URL"
      }
    }
    ```
-   **錯誤回應：**
    -   `400 Bad Request`: 驗證錯誤 (例如：缺少欄位、`contentType` 或 `uploadType` 不受支援)。 `errorCode: VALIDATION_ERROR` 或 `FILE_TYPE_NOT_ALLOWED`。
    -   `500 Internal Server Error`: 產生預簽名 URL 時發生 S3 錯誤。 `errorCode: S3_ERROR`。

## WebSocket API

本服務使用 Socket.IO 進行即時通訊。客戶端應連接到伺服器的根路徑 (`/`)。

### 事件

#### 客戶端 -> 伺服器

-   `connection`: 當客戶端成功連接到 Socket.IO 伺服器時自動觸發。
-   `joinConversation`: 客戶端在進入特定對話的聊天室時，應發送此事件，並帶上 `conversationId` 作為參數。伺服器會將此客戶端加入到對應的 Socket.IO room。
    -   **參數：** `{ conversationId: string }`

#### 伺服器 -> 客戶端

-   `newMessage`: 當特定對話中有新訊息建立時，伺服器會將此事件廣播到該對話 (`conversationId`) 的 Socket.IO room 中的所有客戶端。
    -   **參數：** `{ message: MessageObject }` (包含完整訊息詳情，發送者已 populate)
-   `error`: 當 WebSocket 操作發生錯誤時，伺服器可能會發送此事件給相關客戶端。
    -   **參數：** `{ message: string, details?: any }`

## 初始資料載入

若環境變數 `LOAD_INITIAL_DATA` 設定為 `true`，應用程式啟動時會檢查資料庫。如果相關集合 (collections) 為空，則會嘗試從專案根目錄下的 `chat_data.json` 檔案載入初始的使用者、對話和訊息資料。

這對於開發和測試環境快速填充資料非常有用。

## 錯誤處理與驗證

-   **統一錯誤處理**：透過 `src/middlewares/errorHandler.js` 中介軟體，所有 API 路由的錯誤都會被捕獲並以標準化的 JSON 格式回應（詳見「通用回應格式」）。
-   **輸入驗證**：使用 Joi 套件對 API 的請求參數 (`params`) 和請求主體 (`body`) 進行驗證。相關驗證 schemas 定義在 `src/validators/` 目錄下。如果驗證失敗，會回傳 `400 Bad Request` 並附帶詳細的錯誤資訊。

## 專案結構

```
meepShopTestApi/
├── src/
│   ├── api/                     # API 路由定義 (例如：userRoutes.js, conversationRoutes.js)
│   │   └── userRoutes.js
│   │   └── conversationRoutes.js
│   │   └── messageRoutes.js       # (如果將訊息路由分開)
│   │   └── uploadRoutes.js
│   ├── config/                  # 設定檔 (例如：資料庫、AWS)
│   │   └── database.config.js
│   │   └── socket.config.js
│   ├── controllers/             # Koa 控制器 (處理請求邏輯)
│   │   └── userController.js
│   │   └── conversationController.js
│   │   └── messageController.js
│   │   └── uploadController.js
│   ├── middlewares/             # Koa 中介軟體
│   │   └── errorHandler.js
│   ├── models/                  # Mongoose 資料模型
│   │   └── user.js
│   │   └── conversation.js
│   │   └── message.js
│   ├── services/                # 服務層 (例如：S3 互動邏輯)
│   │   └── s3Service.js
│   │   └── socketService.js
│   ├── validators/              # Joi 驗證 schemas
│   │   └── userValidators.js
│   │   └── conversationValidators.js
│   │   └── messageValidators.js
│   │   └── uploadValidators.js
│   ├── app.js                   # Koa 應用程式實例與中介軟體設定
│   ├── server.js                # 伺服器啟動 (HTTP 和 Socket.IO)
│   ├── socketManager.js         # WebSocket 伺服器設定與管理
│   └── initialLoad.js           # 初始資料載入邏輯
├── .env.example                 # 環境變數範本檔案
├── .gitignore                   # Git 忽略檔案列表
├── chat_data.json               # 初始種子資料
├── package.json
├── package-lock.json
└── README.md                    # 就是您現在正在看的這個檔案
```

## 部署建議

將此 Node.js 應用程式部署到生產環境時，請考慮以下幾點：

1.  **環境變數**：
    *   設定 `NODE_ENV=production`。
    *   安全地管理您的 `.env` 檔案或使用雲端服務提供商 (如 AWS Systems Manager Parameter Store, HashiCorp Vault) 的秘密管理服務。
    *   對於 AWS 服務 (如 S3)，在 EC2 或 Lambda 等環境中，優先使用 IAM 角色授予權限，而不是硬編碼 Access Key。

2.  **程序管理器 (Process Manager)**：
    *   使用如 PM2 或 Supervisor 來管理您的 Node.js 程序。它們可以處理程序重啟、日誌管理、負載平衡 (叢集模式) 等。
    *   PM2 設定範例 (`ecosystem.config.js`)：
        ```javascript
        module.exports = {
          apps : [{
            name   : "meepshop-chat-api",
            script : "./src/server.js",
            instances : "max", // 或者指定核心數量
            exec_mode : "cluster", // 啟用叢集模式
            watch: false, // 生產環境中通常不建議 watch
            env_production: {
               NODE_ENV: "production",
               PORT: 3000, // 或其他您想要的埠號
               // ... 其他生產環境變數 ...
            }
          }]
        }
        ```
        啟動： `pm2 start ecosystem.config.js --env production`

3.  **反向代理 (Reverse Proxy)**：
    *   在您的 Node.js 應用程式前設定一個反向代理，例如 Nginx 或 Apache。
    *   **好處**：
        *   **埠號映射**：將公開的 80 (HTTP) 和 443 (HTTPS) 埠號請求轉發到 Node.js 應用程式執行的內部埠號 (例如 3000)。
        *   **SSL/TLS 終止**：由 Nginx 處理 HTTPS 加密/解密，減輕 Node.js 應用程式的負擔。
        *   **負載平衡**：如果您的應用程式以叢集模式執行或有多個實例，Nginx 可以分發流量。
        *   **靜態檔案服務**：雖然此專案主要是 API，但如果未來有靜態內容，Nginx 處理更有效率。
        *   **快取**：可以設定快取策略。
        *   **安全性**：提供額外的安全層，例如速率限制、IP 黑名單等。
    *   Nginx 設定範例 (基本 HTTP 轉發，假設 Node.js 在 `localhost:3000`)：
        ```nginx
        server {
            listen 80;
            server_name your_domain.com www.your_domain.com; # 替換成您的域名

            location / {
                proxy_pass http://localhost:3000; # Node.js 應用程式的位址
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_cache_bypass $http_upgrade;
            }
        }
        ```
        對於 WebSocket (`socket.io`)，上述 `proxy_set_header Upgrade $http_upgrade;` 和 `proxy_set_header Connection 'upgrade';` 非常重要。

4.  **HTTPS 設定**：
    *   使用 Let's Encrypt 和 Certbot 在 Nginx 上免費設定 SSL/TLS 憑證，以啟用 HTTPS。以下是建議的步驟：

    1.  **安裝 Certbot 及 Nginx 外掛程式**
        Certbot 是一個自動化工具，用於從 Let's Encrypt 獲取和續期 SSL/TLS 憑證。`python3-certbot-nginx` 外掛程式允許 Certbot 自動配置 Nginx。
        *   Ubuntu/Debian: `sudo apt update && sudo apt install certbot python3-certbot-nginx`
        *   CentOS/RHEL (dnf): `sudo dnf install certbot python3-certbot-nginx`
        *   CentOS/RHEL (yum): `sudo yum install certbot python3-certbot-nginx`

    2.  **設定 Nginx HTTP Server Block**
        在執行 Certbot 之前，請確保您的 Nginx 已有一個針對您域名的 HTTP `server` 區塊，並且您的域名已正確指向伺服器的 IP 位址。

        **Nginx 的 `sites-available` 與 `sites-enabled`：**
        Nginx 通常使用 `/etc/nginx/sites-available/` 目錄來存放所有可用的網站設定檔，而 `/etc/nginx/sites-enabled/` 目錄則存放實際啟用的網站設定檔 (通常是前者中檔案的符號連結)。

        *   **建立設定檔**：首先，在 `/etc/nginx/sites-available/` 目錄下為您的域名建立一個設定檔，例如 `/etc/nginx/sites-available/your_domain.com.conf`。
            ```nginx
            server {
                listen 80;
                server_name your_domain.com www.your_domain.com; # 替換成您的域名

                root /var/www/html; # 或您的專案相關目錄
                index index.html index.htm;

                location / {
                    # 初始設定，或指向您的應用程式
                    try_files $uri $uri/ =404; 
                }
            }
            ```
        *   **啟用設定檔 (建立符號連結)**：要啟用此設定，請建立一個從 `sites-available` 到 `sites-enabled` 的符號連結：
            ```bash
            sudo ln -s /etc/nginx/sites-available/your_domain.com.conf /etc/nginx/sites-enabled/
            ```
        *   **測試並重載 Nginx**：在修改設定或建立連結後，務必測試 Nginx 設定並重載服務：
            ```bash
            sudo nginx -t
            sudo systemctl reload nginx
            ```
            **故障排除提示**：如果 `sudo nginx -t` 失敗並顯示類似 `open() "/etc/nginx/sites-enabled/your_domain.com.conf" failed (2: No such file or directory)` 的錯誤，請仔細檢查：
            1. 您的設定檔是否確實存在於 `/etc/nginx/sites-available/your_domain.com.conf`。
            2. 指向它的符號連結 `/etc/nginx/sites-enabled/your_domain.com.conf` 是否已正確建立，且名稱與副檔名 (`.conf`) 完全一致。
            3. Nginx 主設定檔 (`/etc/nginx/nginx.conf`) 中的 `include` 指令是否正確 (例如 `include /etc/nginx/sites-enabled/*.conf;` 或 `include /etc/nginx/sites-enabled/*;`)。

        確保防火牆允許埠 80 和 443 的流量 (例如 `sudo ufw allow 'Nginx Full'`)。

    3.  **執行 Certbot**
        使用 Certbot 獲取憑證並自動更新 Nginx 設定：
        ```bash
        sudo certbot --nginx -d your_domain.com -d www.your_domain.com
        ```
        Certbot 將引導您完成一些設定步驟，包括提供電子郵件地址和同意服務條款。建議選擇將 HTTP 流量重新導向到 HTTPS。

    4.  **自動續期**
        Let's Encrypt 憑證有效期為 90 天。Certbot 通常會自動設定 cron job 或 systemd timer 來處理憑證的自動續期。您可以透過 `sudo certbot renew --dry-run` 測試自動續期設定。

    5.  **Nginx HTTPS 設定範例 (Certbot 修改後)**
        Certbot 會自動修改您的 Nginx 設定檔。一個典型的 HTTPS 設定如下所示：
        ```nginx
        server {
            listen 80;
            server_name your_domain.com www.your_domain.com;

            # 由 Certbot 管理的 HTTP 到 HTTPS 重新導向
            location / {
                return 301 https://$host$request_uri;
            }
        }

        server {
            listen 443 ssl http2; # 啟用 HTTP/2
            server_name your_domain.com www.your_domain.com;

            ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;
            include /etc/letsencrypt/options-ssl-nginx.conf; # Certbot 推薦的 SSL 設定
            ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # Diffie-Hellman 參數

            # 應用程式代理設定 (包括 WebSocket)
            location / {
                proxy_pass http://localhost:3000; # Node.js 應用程式位址
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme; # 重要：告知後端為 HTTPS
                proxy_cache_bypass $http_upgrade;
            }
            
            # 可選：增強安全性的標頭 (請謹慎測試)
            # add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
            # add_header X-Content-Type-Options nosniff;
            # add_header X-Frame-Options DENY;
            # add_header X-XSS-Protection "1; mode=block";
        }
        ```
        請記得將 `your_domain.com` 和 `www.your_domain.com` 替換為您的實際域名，並將 `proxy_pass http://localhost:3000;` 中的埠號指向您 Node.js 應用程式執行的埠號。`X-Forwarded-Proto $scheme;` 標頭對於讓後端應用程式正確識別 HTTPS 連線至關重要。

    *   **關於萬用字元憑證**：當您請求萬用字元憑證 (例如 `*.your_domain.com`) 時，通常需要使用 DNS-01 挑戰，這意味著 Certbot 需要能夠透過 DNS 提供商的 API 自動新增 TXT 記錄。如果您的 DNS 提供商沒有 Certbot 外掛程式，或者您無法進行 API 整合，則需要手動新增 TXT 記錄或為每個子域名單獨申請憑證 (使用 HTTP-01 挑戰，如上所述)。
    *   確保您的域名 A/AAAA 記錄正確指向您的伺服器 IP 位址。

6.  **日誌管理與監控**：
    *   設定集中的日誌管理系統 (例如 ELK Stack, Graylog, Papertrail)。
    *   使用應用程式效能監控 (APM) 工具 (例如 New Relic, Datadog, Sentry) 來追蹤錯誤和效能瓶頸。

7.  **安全性考量**：
    *   定期更新所有依賴套件 (`npm audit fix`)。
    *   設定防火牆 (例如 `ufw` on Ubuntu)。
    *   實作速率限制以防止濫用。
    *   對所有使用者輸入進行嚴格驗證 (已透過 Joi 實現)。
    *   考慮實作更完善的授權邏輯。

## 待辦事項／未來增強功能

-   **使用者身份驗證與授權**：
    -   [ ] 實作 JWT (JSON Web Token) 身份驗證。
    -   [ ] 保護需要身份驗證的 API 端點。
    -   [ ] 實作更細緻的授權邏輯 (例如：只有對話參與者才能發送訊息)。
-   **訊息功能增強**：
    -   [ ] 支援訊息已讀狀態。
    -   [ ] 支援顯示「使用者正在輸入...」狀態。
    -   [ ] 支援刪除訊息 (邏輯刪除或物理刪除)。
    -   [ ] 支援編輯訊息。
-   **使用者個人資料**：
    -   [ ] 允許使用者更新其他個人資料欄位 (例如：狀態、暱稱)。
-   **搜尋功能**：
    -   [ ] 搜尋對話。
    -   [ ] 搜尋訊息。
-   **推播通知**：
    -   [ ] 整合推播通知服務 (例如 Firebase Cloud Messaging, Apple Push Notification service) 以在使用者離線時通知新訊息。
-   **測試**：
    -   [ ] 編寫單元測試。
    -   [ ] 編寫整合測試。
-   **API 文件**：
    -   [x] 更新 `swagger.json` (OpenAPI 3.0) 以符合所有 API 變更。(部分完成，仍需手動處理潛在 Linter 問題)
-   **Socket.IO 錯誤處理**：
    -   [ ] 增強 `socketManager.js` 中的錯誤處理和回饋。
-   **部署流程完善**：
    -   [ ] 建立 Dockerfile 以容器化應用程式。
    -   [ ] 設定 CI/CD (持續整合/持續部署) 流程。
-   **安全性強化**：
    -   [ ] 針對常見 Web 漏洞進行更多防護 (例如 XSS, CSRF - 雖然 API 為主，但仍需注意)。
    -   [ ] 設定更嚴格的 CORS 策略。

---

此 `README.md` 旨在提供專案的概覽、設定指南和 API 文件。隨著專案的發展，請持續更新此文件。 