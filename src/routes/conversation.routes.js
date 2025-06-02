// src/routes/conversation.routes.js
const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const messageController = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Managing user conversations and messages within them
 */

// Public route to get all conversations
/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: Get all conversations in the system (Public)
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Successfully retrieved all conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 results: { type: integer, example: 10 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ConversationResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', conversationController.listAllConversations);

// Protected route to create a new conversation
/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     summary: Create a new conversation (Protected)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConversationInput'
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation: { $ref: '#/components/schemas/ConversationResponse' }
 *       400:
 *         description: Bad request (e.g., missing participantIds)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', protect, conversationController.createConversation);


// Protected route for specific conversation operations
/**
 * @swagger
 * /api/v1/conversations/{conversationId}:
 *   get:
 *     summary: Get a specific conversation by its ID (Protected)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved conversation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation: { $ref: '#/components/schemas/ConversationResponse' }
 *       401:
 *         description: Unauthorized (user not part of conversation or not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:conversationId', protect, conversationController.getConversationById);

// Combined routes for messages within a conversation
/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a specific conversation (Public)
 *     description: Retrieves messages for any given conversation ID. No authentication required.
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation to fetch messages for.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: 'createdAt:asc'
 *         description: Sort order for messages (e.g., 'createdAt:asc' or 'createdAt:desc').
 *     responses:
 *       200:
 *         description: Successfully retrieved messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/MessageResponse' }
 *                     currentPage: { type: integer, example: 1 }
 *                     totalPages: { type: integer, example: 3 }
 *                     totalMessages: { type: integer, example: 150 }
 *       400:
 *         description: Bad request (e.g., invalid conversationId format)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Conversation not found (Note: This check might be implicitly removed if controller stops checking for conversation existence before fetching messages)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new message in a specific conversation (Protected)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation where the message will be posted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMessageInput'
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { $ref: '#/components/schemas/MessageResponse' }
 *       400:
 *         description: Bad request (e.g., missing type or content)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized (user not part of conversation or not logged in)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/:conversationId/messages')
  .get(messageController.getMessages)
  .post(protect, messageController.createMessage);

module.exports = router; 