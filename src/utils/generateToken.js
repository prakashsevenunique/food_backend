import jwt from 'jsonwebtoken';
import dotenv from "dotenv"
dotenv.config();

const generateToken = (id) => {
  console.log("key is", process.env.JWT_SECRET)
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;