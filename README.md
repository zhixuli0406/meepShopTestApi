# Node.js 即時聊天應用程式

本專案旨在建立一個功能完善的即時聊天應用程式，使用 Node.js、Express、Socket.IO 和 MongoDB。支援文字與圖片訊息、使用者認證、群組對話以及即時互動功能。

## 技術棧 (Tech Stack)

- **後端 (Backend)**: Node.js, Express.js
- **資料庫 (Database)**: MongoDB (使用 Mongoose ODM)
- **即時通訊 (Real-time Communication)**: Socket.IO
- **認證 (Authentication)**: JSON Web Tokens (JWT)
- **圖片儲存 (Image Storage)**: AWS S3
- **部署 (Deployment)**: EC2
- **其他 (Others)**: `dotenv` (環境變數管理), `bcryptjs` (密碼雜湊), `morgan` (HTTP 請求記錄), `cors` (跨來源資源共用), `uuid` (唯一ID生成)

## 核心功能 (Core Features)

- **使用者認證**:
    - 註冊新使用者帳號。
    - 使用者登入驗證。
    - 保護特定 API 路由，需提供有效的 JWT。
    - 允許使用者獲取及更新自己的個人資訊。
- **對話管理**:
    - 建立新的對話 (可為兩人或多人對話)。
    - 公開列出系統中所有的對話。
    - 登入使用者可取得自己參與的特定對話資訊。
- **訊息傳遞**:
    - 在對話中發送文字或圖片類型的訊息。
    - **自動加入與系統通知**: 若使用者嘗試在一個他尚未加入的對話中發送訊息，系統會自動將該使用者加入到對話的參與者列表中，並在該對話中廣播一條系統訊息 (例如："User [username] has joined the conversation.")。
    - 公開獲取特定對話的所有訊息，支援分頁 (預設每頁 50 則) 與排序 (預設按時間正序)。
- **即時通訊 (Socket.IO)**:
    - 使用者連線時進行身份驗證 (透過 `userId` query parameter)。
    - 客戶端可以加入 (join) 及離開 (leave) 特定的對話房間 (以 `conversationId` 命名)。
    - 即時接收新訊息：當對話中有新訊息 (包括使用者訊息與系統訊息) 時，房間內所有成員會收到 `newMessage` 事件。
    - 即時更新對話列表：當使用者發送訊息後，相關參與者的對話列表會收到 `updateConversationList` 事件以更新最後訊息。
    - 即時參與者變動通知：當有新使用者透過發言加入對話時，房間內成員會收到 `participantsUpdated` 事件，其中包含更新後的參與者列表。
    - 打字提示 (`typing` / `userTyping` 事件)。
- **圖片處理**:
    - 透過 AWS S3 預簽名 URL (Presigned URL) 機制，允許客戶端安全地直接上傳圖片至指定的 S3 儲存桶。
    - 訊息中儲存圖片的 S3 URL。
- **初始資料載入**:
    - 應用程式在開發模式 (`NODE_ENV=development`) 下首次啟動時，若資料庫中尚無使用者資料，會自動從專案根目錄下的 `chat_data.json` 檔案讀取並匯入預設的使用者、對話和訊息資料至 MongoDB。

## API 端點詳解 (API Endpoints)

所有 API 路徑皆以 `/api/v1` 為前綴。

### 認證 (Authentication)

- **`POST /auth/register`**
    - **功能**: 註冊新使用者。
    - **請求主體 (Request Body)**: `{ "username": "string", "email": "string", "password": "string", "avatar": "string (optional)" }`
    - **回應 (Response)**: 成功時回傳使用者物件及 JWT token。
- **`POST /auth/login`**
    - **功能**: 使用者登入。
    - **請求主體 (Request Body)**: `{ "email": "string", "password": "string" }`
    - **回應 (Response)**: 成功時回傳使用者物件及 JWT token。
- **`GET /auth/me`**
    - **功能**: (需認證) 取得目前登入使用者的詳細資訊。
    - **回應 (Response)**: 使用者物件。
- **`PATCH /auth/me`**
    - **功能**: (需認證) 更新目前登入使用者的資訊 (例如：`username`, `avatar`)。
    - **請求主體 (Request Body)**: `{ "username": "string (optional)", "avatar": "string (optional)" }`
    - **回應 (Response)**: 更新後的使用者物件。

### 使用者 (Users)

- **`GET /users`**
    - **功能**: (需認證) 取得所有使用者的列表。
    - **回應 (Response)**: 使用者物件陣列 (不包含密碼)。

### 對話 (Conversations)

- **`POST /conversations`**
    - **功能**: (需認證) 建立新的對話。
    - **請求主體 (Request Body)**: `{ "participantIds": ["userId1", "userId2"], "title": "string (optional, for group chats)" }`
    - **回應 (Response)**: 新建立的對話物件。
- **`GET /conversations`**
    - **功能**: 取得所有對話的列表 (公開)。
    - **回應 (Response)**: 對話物件陣列。
- **`GET /conversations/:conversationId`**
    - **功能**: (需認證) 取得特定對話的詳細資訊。使用者必須是該對話的參與者。
    - **路徑參數 (Path Parameters)**: `conversationId` (對話的 MongoDB ID)。
    - **回應 (Response)**: 對話物件。

### 訊息 (Messages)

- **`POST /conversations/:conversationId/messages`**
    - **功能**: (需認證) 在特定對話中建立新訊息。
        - 若發送者非此對話成員，將自動加入，並產生一條系統訊息通知其他成員。
    - **路徑參數 (Path Parameters)**: `conversationId`。
    - **請求主體 (Request Body)**: `{ "type": "text" | "image", "content": "string (text content or image URL)" }`
    - **回應 (Response)**: 新建立的訊息物件 (以及可能的系統訊息物件)。
- **`GET /conversations/:conversationId/messages`**
    - **功能**: 取得特定對話的訊息列表 (公開)。
    - **路徑參數 (Path Parameters)**: `conversationId`。
    - **查詢參數 (Query Parameters)**:
        - `page` (integer, optional, default: 1): 分頁頁碼。
        - `limit` (integer, optional, default: 50): 每頁訊息數量。
        - `sortBy` (string, optional, default: 'createdAt:asc'): 排序欄位與順序，例如 `'createdAt:desc'`。
    - **回應 (Response)**: 包含訊息陣列及分頁資訊的物件。
- **`POST /messages/:messageId/reactions`**
    - **功能**: (公開) 對特定訊息增加或移除一個反應 (reaction)。任何人都可以執行此操作。
    - **路徑參數 (Path Parameters)**: `messageId` (要反應的訊息的 MongoDB ID)。
    - **請求主體 (Request Body)**: `{ "reactionType": "string (e.g., 'like', 'love')", "action": "increment" | "decrement" }`
    - **回應 (Response)**: 更新後的訊息 ID 及 reactions 物件。
    - **Socket.IO 事件**: 向對話房間廣播 `messageReactionUpdated` 事件，內容包含 `{ messageId, reactions }`。

### 檔案上傳 (File Uploads)

- **`POST /uploads/generate-presigned-url`**
    - **功能**: (需認證) 為客戶端產生一個 AWS S3 預簽名 URL，用於上傳圖片。
    - **請求主體 (Request Body)**: `{ "fileName": "string", "fileType": "string (e.g., 'image/jpeg')" }`
    - **回應 (Response)**: `{ "uploadUrl": "string (presigned URL)", "key": "string (S3 object key)" }`

## 如何執行 (How to Run)

1.  **環境設定**:
    - 複製根目錄下的 `.env.example` 檔案，並將其重新命名為 `.env`。
    - 開啟 `.env` 檔案，填入所有必要的環境變數，例如：
        - `NODE_ENV` (e.g., `development` or `production`)
        - `PORT` (e.g., `3000`)
        - `MONGO_URI` (您的 MongoDB 連線字串)
        - `JWT_SECRET` (用於簽署 JWT 的密鑰)
        - `JWT_EXPIRES_IN` (JWT 有效期限，e.g., `90d`)
        - `AWS_ACCESS_KEY_ID` (您的 AWS IAM 使用者 Access Key ID)
        - `AWS_SECRET_ACCESS_KEY` (您的 AWS IAM 使用者 Secret Access Key)
        - `AWS_REGION` (您的 S3 儲存桶所在區域，e.g., `ap-northeast-1`)
        - `AWS_S3_BUCKET_NAME` (您的 S3 儲存桶名稱)

2.  **安裝依賴套件**:
    在專案根目錄下執行：
    ```bash
    npm install
    ```

3.  **啟動應用程式**:
    - **開發模式 (Development Mode)** (使用 `nodemon` 自動重啟)：
        ```bash
        npm run dev
        ```
    - **生產模式 (Production Mode)** (或直接執行)：
        ```bash
        npm start
        ```
    應用程式預設會在 `.env` 中設定的 `PORT` (例如 3000) 上執行。

## 專案結構 (Project Structure)

```
.
├── config/                   # 設定檔目錄
│   ├── db.js                 # MongoDB 連線設定
│   ├── index.js              # 環境變數載入與匯出
│   └── swaggerOptions.js     # Swagger JSDoc 設定
├── public/                   # 靜態檔案 (若有)
├── scripts/                  # 輔助腳本 (例如 Swagger JSON 產生)。資料匯入邏輯已移至 src/utils/seedDatabase.js
├── src/                      # 原始碼目錄
│   ├── controllers/          # 控制器 (處理 HTTP 請求)
│   ├── middlewares/          # Express 中介軟體
│   ├── models/               # Mongoose 資料模型
│   ├── routes/               # Express 路由定義
│   ├── services/             # 服務層 (核心業務邏輯)
│   ├── sockets/              # Socket.IO 事件處理
│   └── utils/                # 工具函式 (錯誤處理, 非同步處理, 資料庫填充等)
├── .env                      # 環境變數 (執行時從 .env.example 複製並填寫)
├── .env.example              # 環境變數範例檔
├── .gitignore                # Git 忽略檔案設定
├── app.js                    # Express 應用程式配置 (中介軟體, 路由掛載)
├── chat_data.json            # 初始聊天資料 (用於開發模式自動填充)
├── package-lock.json
├── package.json              # 專案依賴與腳本設定
├── README.md                 # 專案說明文件
└── server.js                 # HTTP 伺服器與 Socket.IO 初始化, 應用程式啟動點
```

## 初始資料 (Initial Data)

應用程式在**開發模式** (`NODE_ENV=development`) 下啟動時，如果偵測到資料庫中尚無 `User` 資料，將會自動執行 `src/utils/seedDatabase.js` 腳本。此腳本會：
1.  讀取專案根目錄下的 `chat_data.json` 檔案。
2.  將 `chat_data.json` 中的使用者、對話和訊息資料轉換並儲存到 MongoDB 資料庫中。
    -   使用者的預設密碼在匯入時會被設定為 `password123` (請僅用於開發測試)。

這有助於快速建立一個包含初始內容的開發環境。

## EC2 部署考量 (EC2 Deployment Considerations - Planning)

以下為部署至 AWS EC2 時需要考量的面向 (目前為規劃階段)：
-   **EC2 實例選擇**: 根據預期負載選擇合適的實例類型。
-   **環境設定**:
    -   安裝 Node.js, npm/yarn。
    -   安裝 MongoDB (可使用 EC2 本地安裝，或連接至 Atlas/DocumentDB 等雲端服務)。
    -   透過 `.env` 檔案或 EC2 參數儲存等方式管理環境變數。
-   **程式碼部署**: 使用 Git clone, SCP, CodeDeploy 等方式。
-   **程序管理**: 使用 PM2 或類似工具來管理 Node.js 程序，確保其穩定運行並能自動重啟。
-   **網路安全**:
    -   設定 EC2 安全性群組 (Security Groups) 以限制入站流量 (例如，只允許 HTTP/HTTPS 及 SSH)。
    -   使用反向代理 (例如 Nginx) 來處理傳入請求、負載平衡 (若有多實例) 及提供 SSL/TLS 終止。
    -   設定 HTTPS (例如使用 Let's Encrypt 免費憑證)。
-   **日誌管理**: 設定日誌輪替及集中式日誌收集 (例如 CloudWatch Logs)。
-   **監控與備份**: 設定監控警報 (例如 CloudWatch Alarms) 及資料庫備份策略。 