import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import WalletTransaction from "../models/walletModel.js";
import Order from "../models/orderModel.js";

export const getWallet = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [summary] = await WalletTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] },
        },
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCredit: 1,
        totalDebit: 1,
      },
    },
  ]);

  const recentTransactions = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      balance: summary,

      transactions: recentTransactions,
    },
  });
});

export const creditWallet = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { amount, description, orderId, meta } = req.body;

  const tx = await WalletTransaction.create({
    userId,
    type: "credit",
    amount,
    description,
    orderId,
    meta,
  });

  res.json({ success: true, message: "Wallet credited", transaction: tx });
});

export const debitWallet = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { amount, description, orderId, meta } = req.body;

  const [summary] = await WalletTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] },
        },
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
      },
    },
  ]);

  const currentBalance = summary?.balance || 0;

  if (currentBalance < amount) {
    return res
      .status(400)
      .json({ success: false, message: "Insufficient wallet balance" });
  }

  const tx = await WalletTransaction.create({
    userId,
    type: "debit",
    amount,
    description,
    orderId,
    meta,
  });

  res.json({ success: true, message: "Wallet debited", transaction: tx });
});

export const getAllWallets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const { userId } = req.query;

  const matchStage = userId
    ? { $match: { userId: new mongoose.Types.ObjectId(userId) } }
    : { $match: {} };

  const wallets = await WalletTransaction.aggregate([
    matchStage,
    {
      $group: {
        _id: "$userId",
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] },
        },
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
        },
      },
    },
    {
      $project: {
        userId: "$_id",
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
      },
    },
    { $sort: { balance: -1 } },
    ...(userId ? [] : [{ $skip: skip }, { $limit: limit }]),
  ]);

  res.json({ success: true, page, wallets });
});

export const refundWalletOnCancel = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order || order.status !== "cancelled") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or un-cancelled order" });
  }

  const existingRefund = await WalletTransaction.findOne({
    orderId,
    type: "credit",
    description: "Refund for cancelled order",
  });

  if (existingRefund) {
    return res.status(409).json({
      success: false,
      message: "Refund already processed for this order",
    });
  }

  const tx = await WalletTransaction.create({
    userId: order.userId,
    type: "credit",
    amount: order.totalAmount,
    description: "Refund for cancelled order",
    orderId,
  });

  res.json({ success: true, message: "Refund processed", transaction: tx });
});

export const getUserTransactions = async (req, res) => {
  try {
    const {
      userId, // ✅ NEW: allows admin to see all users or specific user
      restaurantId, // ✅ OPTIONAL: only if used in your schema
      type,
      status,
      paymentMethod,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    console.log("User Transactions Query:", req.query);

    const query = {};

    // ✅ If userId is passed (admin), use that; otherwise fallback to logged-in user
    if (req.user?.role === 'admin') {
      if (userId) query.userId = userId;
    } else {
      query.userId = req.user._id;
    }

    if (restaurantId) {
      query.restaurantId = restaurantId; // ✅ if this field exists
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { utr: { $regex: search, $options: 'i' } },
        { trxId: { $regex: search, $options: 'i' } },
      ];
    }

    const transactions = await WalletTransaction.find(query)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await WalletTransaction.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: transactions,
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
