import express from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

const addressController = {
  getAddresses: (req, res) => {
    res.status(200).json({ message: 'Get addresses' });
  },
  createAddress: (req, res) => {
    res.status(201).json({ message: 'Address created successfully' });
  },
  getAddressById: (req, res) => {
    res.status(200).json({ message: 'Get address by ID' });
  },
  updateAddress: (req, res) => {
    res.status(200).json({ message: 'Address updated successfully' });
  },
  deleteAddress: (req, res) => {
    res.status(200).json({ message: 'Address deleted successfully' });
  },
  setDefaultAddress: (req, res) => {
    res.status(200).json({ message: 'Default address set successfully' });
  },
};

router.route('/')
  .get(protect, addressController.getAddresses)
  .post(
    protect,
    [
      body('addressType')
        .isIn(['HOME', 'WORK', 'OTHER'])
        .withMessage('Address type must be HOME, WORK, or OTHER'),
      body('addressLine1').notEmpty().withMessage('Address line 1 is required'),
      body('city').notEmpty().withMessage('City is required'),
      body('state').notEmpty().withMessage('State is required'),
      body('postalCode').notEmpty().withMessage('Postal code is required'),
      body('contactPhone').notEmpty().withMessage('Contact phone is required'),
      body('contactName').notEmpty().withMessage('Contact name is required'),
      validateRequest,
    ],
    addressController.createAddress
  );

router.route('/:id')
  .get(
    protect,
    [
      param('id').notEmpty().withMessage('Address ID is required'),
      validateRequest,
    ],
    addressController.getAddressById
  )
  .put(
    protect,
    [
      param('id').notEmpty().withMessage('Address ID is required'),
      validateRequest,
    ],
    addressController.updateAddress
  )
  .delete(
    protect,
    [
      param('id').notEmpty().withMessage('Address ID is required'),
      validateRequest,
    ],
    addressController.deleteAddress
  );

router.patch(
  '/:id/default',
  protect,
  [
    param('id').notEmpty().withMessage('Address ID is required'),
    validateRequest,
  ],
  addressController.setDefaultAddress
);

export default router;