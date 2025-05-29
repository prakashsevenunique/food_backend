import express from 'express';
import { callbackPayIn, callbackPayout, createPayIn, initiatePayout } from '../controllers/paymentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/payin',protect, createPayIn);
router.post('/callback/payin', callbackPayIn);
router.post("/payout", initiatePayout);
router.post('/callback/payout', callbackPayout);

export default router;
