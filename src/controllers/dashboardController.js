import jwt from "jsonwebtoken";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Restaurant from "../models/restaurantModel.js";
import dotenv from "dotenv";
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

export const getDashboardSummary = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing or malformed" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (user.role === "admin") {
      // Admin Dashboard
      const [orderStats, customerStats, restaurantStats] = await Promise.all([
        Order.aggregate([
          { $match: { status: "completed" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
              totalOrders: { $sum: 1 }
            }
          }
        ]),
        User.countDocuments({}),
        Restaurant.countDocuments({})
      ]);

      const revenueData = orderStats[0] ?? { totalRevenue: 0, totalOrders: 0 };

      return res.status(200).json({
        totalRevenue: revenueData.totalRevenue,
        totalOrders: revenueData.totalOrders,
        totalCustomers: customerStats,
        totalRestaurants: restaurantStats
      });

    } else if (user.role === "restaurant") {
      // Restaurant Owner Dashboard

      const restaurantId = user._id;

      const [orderStats, pendingOrders, customerStats] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              restaurant: restaurantId,
              createdAt: { $gte: last24Hours }
            }
          },
          {
            $group: {
              _id: null,
              todayRevenue: { $sum: "$finalAmount" },
              todayOrders: { $sum: 1 }
            }
          }
        ]),
        Order.countDocuments({
          restaurant: restaurantId,
          createdAt: { $gte: last24Hours },
          paymentStatus: "PENDING"
        }),
        User.countDocuments({
          role: "user",
          createdAt: { $gte: last24Hours }
        })
      ]);

      const revenueData = orderStats[0] ?? { todayRevenue: 0, todayOrders: 0 };

      return res.status(200).json({
        todayRevenue: revenueData.todayRevenue,
        todayOrders: revenueData.todayOrders,
        todayCustomers: customerStats,
        todayPendingOrders: pendingOrders
      });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

  } catch (err) {
    console.error("Dashboard Summary Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
