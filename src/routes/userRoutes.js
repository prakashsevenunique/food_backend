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

router.post('/send-otp', sendSMSController);
router.post('/verify-otp', verifyOTP);

router.get('/profile', protect, getUserProfile);

router.put('/profile/text', protect, updateUserTextOnly);

router.put('/profile/photo', protect, upload.single('profilePicture'), updateUserProfileImage);

router.route('/favorites')
  .get(protect, getFavorites);

router.route('/favorites/:id')
  .post(protect, addFavorite)
  .delete(protect, removeFavorite);

router.get('/:id', protect, getUserById);
router.get('/', protect, admin, getUsers);
router.delete('/:id', protect, admin, deleteUser);

export default router;