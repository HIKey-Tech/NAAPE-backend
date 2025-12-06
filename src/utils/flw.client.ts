// src/utils/flwClient.ts
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = process.env.BASE_URL || "https://api.flutterwave.com/v3";
const FLW_SECRET = process.env.FLW_SECRET_KEY!;

export const flw = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
        "Content-Type": "application/json",
    },
});
