import express from 'express';
import { body } from 'express-validator';
import {
  createFoodItem,
  getFoodItems,
  getFoodItemById,
  updateFoodItem,
  deleteFoodItem,
  updateAvailability,
  getPopularFoodItems,
  uploadFoodImage
} from '../controllers/menuController.js';
import { protect, restaurant } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

router.route('/')
  .get(getFoodItems)
  .post(
    protect,
    restaurant,
    [
      body('name').notEmpty().withMessage('Food item name is required'),
      body('description').notEmpty().withMessage('Food item description is required'),
      body('price').isNumeric().withMessage('Price must be a number').isFloat({ min: 0 }),
      body('restaurant').notEmpty().withMessage('Restaurant ID is required'),
      body('category').notEmpty().withMessage('Category ID is required'),
      validateRequest,
    ],
    createFoodItem
  );

router.post(
  '/:id/upload-image',
  protect, upload.single('ccc'),
  uploadFoodImage
);

router.get('/popular', getPopularFoodItems);

router.route('/:id')
  .get(getFoodItemById)
  .put(protect, restaurant, updateFoodItem)
  .delete(protect, restaurant, deleteFoodItem);

router.patch(
  '/:id/availability',
  protect,
  restaurant,
  [
    body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean value'),
    validateRequest,
  ],
  updateAvailability
);

export default router;