// src/routes/paymentRoutes.js
import express from 'express';
import { createPayIn, initiatePayout } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/payin', createPayIn);
router.post("/payout", initiatePayout);

export default router;
