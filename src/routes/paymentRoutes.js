import express from 'express';
import { body, param } from 'express-validator';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Placeholder for payment controller (to be implemented)
const paymentController = {
  createPayment: (req, res) => {
    res.status(200).json({ message: 'Payment created successfully' });
  },
  getPaymentStatus: (req, res) => {
    res.status(200).json({ message: 'Get payment status' });
  },
  updatePaymentStatus: (req, res) => {
    res.status(200).json({ message: 'Payment status updated successfully' });
  },
  initiateRefund: (req, res) => {
    res.status(200).json({ message: 'Refund initiated successfully' });
  },
  getRefundStatus: (req, res) => {
    res.status(200).json({ message: 'Get refund status' });
  },
  capturePayment: (req, res) => {
    res.status(200).json({ message: 'Payment captured successfully' });
  },
  verifyPayment: (req, res) => {
    res.status(200).json({ message: 'Payment verified successfully' });
  },
};

router.post(
  '/create',
  protect,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .isFloat({ min: 1 })
      .withMessage('Amount must be greater than 0'),
    body('currency')
      .optional()
      .isIn(['INR', 'USD'])
      .withMessage('Currency must be INR or USD'),
    validateRequest,
  ],
  paymentController.createPayment
);

router.get(
  '/status/:id',
  protect,
  [
    param('id').notEmpty().withMessage('Payment ID is required'),
    validateRequest,
  ],
  paymentController.getPaymentStatus
);

router.post(
  '/verify',
  [
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
    validateRequest,
  ],
  paymentController.verifyPayment
);

router.post(
  '/capture/:id',
  protect,
  admin,
  [
    param('id').notEmpty().withMessage('Payment ID is required'),
    validateRequest,
  ],
  paymentController.capturePayment
);

router.post(
  '/refund',
  protect,
  [
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .isFloat({ min: 1 })
      .withMessage('Amount must be greater than 0'),
    body('reason').notEmpty().withMessage('Reason is required'),
    validateRequest,
  ],
  paymentController.initiateRefund
);

router.get(
  '/refund/:id',
  protect,
  [
    param('id').notEmpty().withMessage('Refund ID is required'),
    validateRequest,
  ],
  paymentController.getRefundStatus
);

export default router;