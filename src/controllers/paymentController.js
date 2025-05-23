import axios from 'axios';
import Payment from '../models/paymentModel.js';
import { v4 as uuidv4 } from 'uuid';

const WORLDPAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4IiwianRpIjoiN2VlOGQ5N2QxY2Q5ZjEyMWVlMjMyNjUzMDhiYjFkYWUwMmZhMjAyYTNlMjBlZjY2N2YzOTIxNzIwNWYzYjA3MWE0MmJiMDgwNDA3MDJhNDciLCJpYXQiOjE3NDc4OTMxMjQuNjgzMTAxLCJuYmYiOjE3NDc4OTMxMjQuNjgzMTE0LCJleHAiOjE3Nzk0MjkxMjQuNjgwOTA0LCJzdWIiOiIzMDAiLCJzY29wZXMiOltdfQ.OivNY8FrVq880hcFV9s-HQb5HTC7Dj01eODM7e9eLbov1uo-O3JnUxBXLqBQiWQSXUEQuQccy1hjtqJoRnHuqGpW7Kq-r0GQ8-N3fxJDAwhAlTaF8zkVlVc8dWcQu5i9U6cGKBHi8GZUp9aSYrovuM40N0E9YLcITDTiBV6eUNYYmXVDAGUjU2p7NBdxLZRSLQWhbq3NksqMSzEizy3AN9tRDsfsd3SZwiZBEQ6bLblqIdqiKaoFLLM_xMjkN6rb-epCEcGUcJgi-y2MhDFyo0sQV31OK6SMjrhYvn9UoKX7HoC7yTttRGjDWz62qNnxojbaIMV3uYVF4U1-HsnCSEESJrh4rvkPiIfxafx3XsWcnpDY7ZPHP9nSo2x1avgVeAxTrz5r4fH4aUnAGORaDaFROwXW2ZOV9VvpEJWoMd7ee0OlCEyk5f1F1enT30N4NOME99JJeM4bKJxxaT2vKh-EDWp8oKlNrFmTCXQnNpmBjyp23zuEmnir0oTHrHBr0DjNSqDqX58wjoUK_Rpg_9c7LqqvDbHCxF8MC2t9ugcyeMdpcdX140cP4shzvrp7h53bes1Pd32leHzYXCndk6eqqzIIrmkIB4ljnAHf3BHL9S1kb3GKi7Hg2k_NNM6sPwlGvsf3F6g5krum585uFs1snm4LlYANna3l0XvmBLc"; // static test token

export const createPayIn = async (req, res) => {
    try {
    const payload = {
        amount: req.body.amount,
        reference: req.body.reference,
        name: req.body.name,
        mobile: req.body.mobile,
        email: req.body.email
    };

        const response = await axios.post("https://api.worldpayme.com/api/v1.1/createUpiIntent", payload, {
            headers: {
                Authorization: `Bearer ${WORLDPAY_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.response?.data || error.message });
    }
};

export const callbackPayIn = async (req, res) => {
  try {
    const data = req.body;
    const payin = await PayIn.findOne({ reference: data.reference });

    if (!payin) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (data.status === "Success") {
      const userWallet = await Wallet.findOne({ user: payin.userId });

      payin.status = "Approved";
      payin.utr = data.utr;
      await payin.save();

      userWallet.balance += payin.amount;
      await userWallet.save();

      return res.status(200).json({ message: "PayIn successful", payin });
    }

    payin.status = "Failed";
    await payin.save();

    return res.status(400).json({ message: "Payment Failed", payin });
  } catch (error) {
    console.error("callbackPayIn Error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const initiatePayout = async (req, res) => {
  try {
    const {
      amount,
      reference,
      trans_mode,
      account,
      ifsc,
      name,
      email,
      mobile,
      address,
    } = req.body;

    const form = new FormData();
    form.append("amount", amount);
    form.append("reference", reference);
    form.append("trans_mode", trans_mode);
    form.append("account", account);
    form.append("ifsc", ifsc);
    form.append("name", name);
    form.append("email", email);
    form.append("mobile", mobile);
    form.append("address", address);

    const response = await axios.post(
      "https://api.worldpayme.com/api/v1.1/payoutTransaction?55ff=7788",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.WORLD_PAY_TOKEN}`, // Use .env token
        },
      }
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    console.error("Payout Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || "Payout failed",
    });
  }
};

export const callbackPayout = async (req, res) => {
  try {
    const { status, reference, utr } = req.query;
    const payout = await PayOut.findOne({ reference });

    if (!payout) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (status === "Success") {
      const userWallet = await Wallet.findOne({ user: payout.userId });

      userWallet.balance -= payout.amount;
      await userWallet.save();

      payout.status = "Approved";
      payout.utr = utr;
      await payout.save();

      return res.status(200).json({ message: "PayOut successful", payout });
    }

    payout.status = "Failed";
    await payout.save();

    return res.status(400).json({ message: "Payment Failed", payout });
  } catch (error) {
    console.error("callbackPayout Error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};