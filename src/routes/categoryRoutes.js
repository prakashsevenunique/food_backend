import express from 'express';
import { body, param } from 'express-validator';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Placeholder for category controller (to be implemented)
const categoryController = {
  getCategories: (req, res) => {
    res.status(200).json({ message: 'Get categories' });
  },
  createCategory: (req, res) => {
    res.status(201).json({ message: 'Category created successfully' });
  },
  getCategoryById: (req, res) => {
    res.status(200).json({ message: 'Get category by ID' });
  },
  updateCategory: (req, res) => {
    res.status(200).json({ message: 'Category updated successfully' });
  },
  deleteCategory: (req, res) => {
    res.status(200).json({ message: 'Category deleted successfully' });
  },
};

router.route('/')
  .get(categoryController.getCategories)
  .post(
    protect,
    admin,
    [
      body('name').notEmpty().withMessage('Category name is required'),
      body('type')
        .optional()
        .isIn(['cuisine', 'food-type', 'meal-time'])
        .withMessage('Type must be cuisine, food-type, or meal-time'),
      validateRequest,
    ],
    categoryController.createCategory
  );

router.route('/:id')
  .get(
    [
      param('id').notEmpty().withMessage('Category ID is required'),
      validateRequest,
    ],
    categoryController.getCategoryById
  )
  .put(
    protect,
    admin,
    [
      param('id').notEmpty().withMessage('Category ID is required'),
      validateRequest,
    ],
    categoryController.updateCategory
  )
  .delete(
    protect,
    admin,
    [
      param('id').notEmpty().withMessage('Category ID is required'),
      validateRequest,
    ],
    categoryController.deleteCategory
  );

export default router;