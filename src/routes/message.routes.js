// src/routes/message.routes.js
const express = require('express');
const messageController = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Retrieving messages for a conversation
 */

router.use(protect); // All routes below are protected

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Get messages for a specific conversation with pagination
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
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
 *         description: Bad request (e.g., missing conversationId)
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
router.get('/', messageController.getMessages);

module.exports = router; 