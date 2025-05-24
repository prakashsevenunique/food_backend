import express from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import {
  createReview,
  getReviews,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

router
  .route('/')
  .get(getReviews)
  .post(
    protect,
    [
      body('restaurant').notEmpty().withMessage('Restaurant ID is required'),
      body('order').notEmpty().withMessage('Order ID is required'),
      body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
      validateRequest,
    ],
    createReview
  );

router
  .route('/:id')
  .put(
    protect,
    [
      param('id').notEmpty().withMessage('Review ID is required'),
      body('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
      validateRequest,
    ],
    updateReview
  )
  .delete(protect, deleteReview);

export default router;
