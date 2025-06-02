const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload utilities, such as generating presigned URLs for S3
 */

router.use(protect);

/**
 * @swagger
 * /api/v1/upload/presigned-url:
 *   get:
 *     summary: Generate a presigned URL for uploading a file to AWS S3
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: The original name of the file (e.g., 'my-image.jpg').
 *       - in: query
 *         name: fileType
 *         required: true
 *         schema:
 *           type: string
 *         description: The MIME type of the file (e.g., 'image/jpeg', 'image/png').
 *     responses:
 *       200:
 *         description: Successfully generated presigned URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 data: { $ref: '#/components/schemas/PresignedUrlResponse' }
 *       400:
 *         description: Bad request (e.g., missing fileName or fileType)
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
 *       500:
 *         description: Internal server error (e.g., S3 bucket not configured, error generating URL)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/presigned-url', uploadController.generatePresignedS3Url);

module.exports = router; 