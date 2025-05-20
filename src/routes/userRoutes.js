import express from 'express';
import {
  sendSMSController,
  verifyOTP,
  getUserProfile,
  updateUserTextOnly,
  updateUserProfileImage,
  getUsers,
  deleteUser,
  addFavorite,
  removeFavorite,
  getFavorites,
  getUserById
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// OTP login routes
router.post('/send-otp', sendSMSController);
router.post('/verify-otp', verifyOTP);

// Get user profile
router.get('/profile', protect, getUserProfile);

// Update user text details
router.put('/profile/text', protect, updateUserTextOnly);

// Update user photo
router.put('/profile/photo', protect, upload.single('profilePicture'), updateUserProfileImage);

// Favorites
router.route('/favorites')
  .get(protect, getFavorites);

router.route('/favorites/:id')
  .post(protect, addFavorite)
  .delete(protect, removeFavorite);

// Admin user routes
router.get('/:id', protect, getUserById);
router.get('/', protect, admin, getUsers);
router.delete('/:id', protect, admin, deleteUser);

export default router;