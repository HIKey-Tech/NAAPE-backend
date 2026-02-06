import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

interface DecodedToken {
    id: string;
    role: "admin" | "editor" | "member";
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    //Extract Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    //Reject if no token
    if (!token) {
        return res.status(401).json({ message: "Unauthorized, no token provided" });
    }

    try {
        //Decode token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as DecodedToken;

        //Find user and attach to request
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        //Attach user to request (the missing piece!)
        (req as any).user = user;

        //Proceed to next handler
        next();
    } catch (error: any) {
        console.error("JWT verification failed:", error.message);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

export const optionalProtect = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            const user = await User.findById(decoded.id).select("-password");

            if (user) {
                (req as any).user = user;
            }
        }

        next(); // Always proceed
    } catch (error) {
        next(); // Fail silently → guest access
    }
};


export const errorHandler = (err, req, res, next) => {
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];

        return res.status(409).json({
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exist`,
        })
    }

    res.status(err.statusCode || 500).json({
        message: err.message || "Internal server error"
    })
}
