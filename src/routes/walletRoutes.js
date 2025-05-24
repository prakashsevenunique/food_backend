import express from 'express';
const router = express.Router();

import {
  getWallet,
  creditWallet,
  debitWallet,
  getAllWallets,
  refundWalletOnCancel,
} from '../controllers/walletController.js';

import { protect, admin } from '../middleware/authMiddleware.js';

router.use(protect);

router.get('/', getWallet);
router.post('/credit', creditWallet);
router.post('/debit', debitWallet);

router.get('/admin/wallets', admin, getAllWallets);
router.post('/admin/refund', admin, refundWalletOnCancel);

export default router;