import { Request, Response, NextFunction } from "express";
import { Subscription } from "../models/Subscription";

export const requireSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;

        const subscription = await Subscription.findOne({
            userId: user._id,
            status: "active",
        });

        if (!subscription) {
            return res.status(403).json({
                error: "Active subscription required",
            });
        }

        // attach subscription to request for reuse
        (req as any).subscription = subscription;

        next();
    } catch (error) {
        return res.status(500).json({ error: "Subscription check failed" });
    }
};
