import axios from 'axios';
import Payment from '../models/paymentModel';
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