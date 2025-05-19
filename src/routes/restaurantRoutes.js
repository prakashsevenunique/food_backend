import express from 'express';
import { body } from 'express-validator';
import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantMenu,
  getRestaurantReviews,
  getNearbyRestaurants,
  updateRestaurantImages,
} from '../controllers/restaurantController.js';
import { protect, admin, restaurant } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getRestaurants)
  .post(
    protect,
    restaurant,
    [
      body('name').notEmpty().withMessage('Restaurant name is required'),
      body('description')
        .notEmpty()
        .withMessage('Restaurant description is required'),
      body('address').isObject().withMessage('Address must be an object'),
      body('address.street')
        .notEmpty()
        .withMessage('Street address is required'),
      body('address.city').notEmpty().withMessage('City is required'),
      body('address.state').notEmpty().withMessage('State is required'),
      body('address.zipCode').notEmpty().withMessage('Zip code is required'),
      body('location').isObject().withMessage('Location must be an object'),
      body('location.coordinates')
        .isArray()
        .withMessage('Coordinates must be an array [longitude, latitude]'),
      body('contact').isObject().withMessage('Contact must be an object'),
      body('contact.phone')
        .notEmpty()
        .withMessage('Contact phone is required'),
      body('contact.email')
        .isEmail()
        .withMessage('Please provide a valid email'),
      validateRequest,
    ],
    createRestaurant
  );

router.get('/nearby', getNearbyRestaurants);

router.route('/:id')
  .get(getRestaurantById)
  .put(protect, restaurant, updateRestaurant)
  .delete(protect, admin, deleteRestaurant);

router.get('/:id/menu', getRestaurantMenu);
router.get('/:id/reviews', getRestaurantReviews);

router.put(
  '/:id/images',
  protect,
  restaurant,
  [
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('coverImage').optional().isString().withMessage('Cover image must be a string'),
    validateRequest,
  ],
  updateRestaurantImages
);

export default router;