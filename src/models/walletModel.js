import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit", "promotional"],
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "bank"],
      default: "wallet",
      required: true,
    },
    description: { type: String },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    meta: { type: Object },
    utr: { type: String }, // Unique Transaction Reference
    trxId: { type: String }, // Transaction ID
  },
  { timestamps: true }
);

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);
export default WalletTransaction;
