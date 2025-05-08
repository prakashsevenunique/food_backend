import express from 'express';
import { body, param } from 'express-validator';
import { protect, restaurant } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Placeholder for review controller (to be implemented)
const reviewController = {
  createReview: (req, res) => {
    res.status(200).json({ message: 'Review created successfully' });
  },
  getReviews: (req, res) => {
    res.status(200).json({ message: 'Get reviews' });
  },
  updateReview: (req, res) => {
    res.status(200).json({ message: 'Review updated successfully' });
  },
  deleteReview: (req, res) => {
    res.status(200).json({ message: 'Review deleted successfully' });
  },
  replyToReview: (req, res) => {
    res.status(200).json({ message: 'Reply added to review' });
  },
};

router.route('/')
  .get(reviewController.getReviews)
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
    reviewController.createReview
  );

router.route('/:id')
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
    reviewController.updateReview
  )
  .delete(protect, reviewController.deleteReview);

router.post(
  '/:id/reply',
  protect,
  restaurant,
  [
    param('id').notEmpty().withMessage('Review ID is required'),
    body('text').notEmpty().withMessage('Reply text is required'),
    validateRequest,
  ],
  reviewController.replyToReview
);

export default router;