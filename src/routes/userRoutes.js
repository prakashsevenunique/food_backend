import express from 'express';
import {
  sendSMSController,
  verifyOTP,
  getUserProfile,
  updateUserProfile,
  getUsers,
  deleteUser,
  addFavorite,
  removeFavorite,
  getFavorites,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-otp', sendSMSController);
router.post('/verify-otp', verifyOTP);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/favorites')
  .get(protect, getFavorites);

router.route('/favorites/:id')
  .post(protect, addFavorite)
  .delete(protect, removeFavorite);

router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id')
  .delete(protect, admin, deleteUser);

export default router;
