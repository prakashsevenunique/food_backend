import express from 'express';
import { callbackPayIn, callbackPayout, createPayIn, initiatePayout } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/payin', createPayIn);
router.post('/callback/payin', callbackPayIn);
router.post("/payout", initiatePayout);
router.post('/callback/payout', callbackPayout);

export default router;
