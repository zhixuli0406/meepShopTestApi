const config = require('./index');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MeepShop Chat API',
      version: '1.0.0',
      description: `
API documentation for the MeepShop Chat Application.
The application uses both RESTful APIs for managing users, conversations, and messages, 
and WebSockets for real-time communication.

**WebSocket Communication:**
*   **Connection URL:** Connect to the root WebSocket endpoint (e.g., ws://localhost:${config.port || 3001} or wss://yourdomain.com).
*   **Handshake Query Parameter:**
    *   \'userId\': (string, required) The ID of the authenticated user. This is used to associate the socket connection with the user.
        Example: \'io({ query: { userId: "your_user_id_here" } })\'
*   **Key Client-to-Server Events (Emitted by Client):**
    *   \'joinConversation\':
        *   Payload: \'(conversationId: string)\'
        *   Description: Client requests to join a specific conversation room to receive messages for that conversation.
    *   \'leaveConversation\':
        *   Payload: \'(conversationId: string)\'
        *   Description: Client requests to leave a specific conversation room.
    *   \'sendMessage\':
        *   Payload: \'({ conversationId: string, type: "text" | "image", content: string })\'
        *   Description: Client sends a new message to a conversation. For image messages, 'content' should be the public URL of the uploaded image.
        *   Callback: \'(response: { status: "success" | "error", data?: object, message?: string })\'
    *   \'typing\':
        *   Payload: \'({ conversationId: string, isTyping: boolean })\'
        *   Description: Client indicates they are typing or have stopped typing in a conversation.
*   **Key Server-to-Client Events (Emitted by Server, Listened to by Client):**
    *   \'connected\':
        *   Payload: \'({ message: string })\'
        *   Description: Server confirms successful WebSocket connection and authentication.
    *   \'newMessage\':
        *   Payload: \'(MessageObject)\' (The full message object, populated with sender details)
        *   Description: Server broadcasts a new message to all participants in a conversation room.
    *   \'updateConversationList\':
        *   Payload: \'({ conversationId: string, lastMessage: MessageObject })\'
        *   Description: Server notifies clients (in their user-specific room) that a conversation they are part of has a new message, allowing UI to update conversation list previews.
    *   \'userTyping\':
        *   Payload: \'({ conversationId: string, userId: string, username: string, isTyping: boolean })\'
        *   Description: Server broadcasts typing status of a user to other participants in a conversation room.
    *   \'error\': 
        *   Payload: \'({ message: string })\'
        *   Description: Server emits an error message to the client (e.g., authentication failure during WebSocket connection).
`,
      contact: {
        name: 'API Support',
        // url: 'http://www.example.com/support',
        // email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port || 3001}/api/v1`,
        description: 'Development server',
      },
      // You can add more servers here (e.g., staging, production)
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Will be populated by JSDoc comments from models and routes
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            stack: { type: 'string', description: 'Stack trace (only in development)'}
          }
        },
        UserInput: {
            type: 'object',
            properties: {
                username: { type: 'string', example: 'john_doe' },
                password: { type: 'string', example: 'password123', format: 'password' },
                passwordConfirm: { type: 'string', example: 'password123', format: 'password' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg', nullable: true },
                legacyUserId: { type: 'integer', example: 101, nullable: true, description: 'Legacy user ID from chat_data.json, if applicable' }
            },
            required: ['username', 'password', 'passwordConfirm']
        },
        UserLoginInput: {
            type: 'object',
            properties: {
                username: { type: 'string', example: 'john_doe' },
                password: { type: 'string', example: 'password123', format: 'password' }
            },
            required: ['username', 'password']
        },
        UserResponse: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
                username: { type: 'string', example: 'john_doe' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                legacyUserId: { type: 'integer', example: 101, nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        },
        AuthResponse: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'success' },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                data: {
                    type: 'object',
                    properties: {
                        user: { '$ref': '#/components/schemas/UserResponse' }
                    }
                }
            }
        },
        ConversationInput: {
            type: 'object',
            properties: {
                participantIds: { 
                    type: 'array', 
                    items: { type: 'string' }, 
                    example: ['60d0fe4f5311236168a109cb', '60d0fe4f5311236168a109cc'],
                    description: 'Array of MongoDB User IDs for participants. The creator is implicitly added.'
                },
                title: { type: 'string', example: 'Project Discussion', nullable: true, description: 'Optional title for group conversations.' }
            },
            required: ['participantIds']
        },
        MessageAuthor: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
                username: { type: 'string', example: 'john_doe' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                legacyUserId: { type: 'integer', example: 101, nullable: true }
            }
        },
        Reaction: {
            type: 'object',
            description: 'Key-value pairs of reaction emoji and count.',
            additionalProperties: {
                type: 'integer',
                example: 1
            },
            example: {
                '👍': 2,
                '❤️': 1
            }
        },
        MessageResponse: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '60d0fe4f5311236168a109cd' },
                conversationId: { type: 'string', example: '60d0fe4f5311236168a109ce' },
                senderId: { '$ref': '#/components/schemas/MessageAuthor' },
                type: { type: 'string', enum: ['text', 'image'], example: 'text' },
                content: { type: 'string', example: 'Hello world!' },
                reactions: { '$ref': '#/components/schemas/Reaction' },
                legacyConvId: { type: 'integer', example: 1, nullable: true },
                legacySenderId: { type: 'integer', example: 101, nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        },
         ConversationResponse: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '60d0fe4f5311236168a109ce' },
                participants: { type: 'array', items: { '$ref': '#/components/schemas/MessageAuthor' } },
                title: { type: 'string', example: 'Project Discussion', nullable: true },
                lastMessage: { '$ref': '#/components/schemas/MessageResponse', nullable: true }, // Or a summarized version
                lastMessageText: { type: 'string', example: 'See you tomorrow!', nullable: true },
                lastMessageTimestamp: { type: 'string', format: 'date-time', nullable: true },
                legacyConvId: { type: 'integer', example: 1, nullable: true },
                createdBy: { '$ref': '#/components/schemas/MessageAuthor', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
            }
        },
        CreateMessageInput: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['text', 'image'], example: 'text'},
                content: { type: 'string', example: 'This is a test message. For image type, this will be the S3 URL.'}
            },
            required: ['type', 'content']
        },
        PresignedUrlResponse: {
            type: 'object',
            properties: {
                presignedUrl: { type: 'string', example: 'https://s3.amazonaws.com/bucket/...' },
                fileKey: { type: 'string', example: 'user-uploads/userId/uuid.jpg' },
                publicUrl: { type: 'string', example: 'https://bucket.s3.region.amazonaws.com/user-uploads/userId/uuid.jpg'}
            }
        }
      }
    },
  },
  apis: [
      './src/routes/*.js', 
      './src/models/*.js' // Include models if you put schema definitions there too
  ],
};

module.exports = swaggerOptions; 