// src/routes/message.routes.js
// This file is now empty as message retrieval is handled under /conversations/:conversationId/messages
const express = require('express');
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message specific operations, including reactions.
 */

/**
 * @swagger
 * /api/v1/messages/{messageId}/reactions:
 *   post:
 *     summary: Add or remove a reaction to a message.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the message to react to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reactionType
 *               - action
 *             properties:
 *               reactionType:
 *                 type: string
 *                 description: The type of reaction (e.g., 'like', 'love', 'laugh').
 *                 example: 'like'
 *               action:
 *                 type: string
 *                 enum: [increment, decrement]
 *                 description: Whether to increment or decrement the reaction count.
 *                 example: 'increment'
 *     responses:
 *       200:
 *         description: Reaction updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                     reactions:
 *                       $ref: '#/components/schemas/Reactions'
 *       400:
 *         description: Bad request (e.g., missing fields, invalid reactionType or action).
 *       401:
 *         description: Unauthorized (user not logged in).
 *       403:
 *         description: Forbidden (user not part of the conversation).
 *       404:
 *         description: Message not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/:messageId/reactions', authMiddleware.protect, messageController.reactToMessage);

// No routes defined here anymore.
// Swagger JSDoc for /api/v1/messages (GET) has been moved or incorporated into
// /api/v1/conversations/{conversationId}/messages (GET) in conversation.routes.js

module.exports = router; // Exporting an empty router 