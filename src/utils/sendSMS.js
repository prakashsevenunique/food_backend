import axios from 'axios';

const sendOtp = async (phone, message) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  const payload = {
    sender_id: 'FSTSMS',
    message: message,
    language: 'english',
    route: 'p', // for transactional use 'p', for promotional use 't'
    numbers: phone.toString(),
  };

  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ SMS Sent:", response);
  } catch (error) {
    console.error("❌ SMS Error:", error.response?.data || error.message);
  }
};

export default sendOtp;
