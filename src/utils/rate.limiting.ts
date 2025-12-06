import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 200,                 // limit each IP
    message: "Too many requests, please try again later.",
});

export const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: "Too many login attempts. Try again in 5 minutes.",
});

