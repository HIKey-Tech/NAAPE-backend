import { Request, Response, NextFunction } from "express";

export const requireTier = (requiredTier: "free" | "premium") => {
    return (req: Request & { subscription?: { tier: string } }, res: Response, next: NextFunction) => {
        const subscription = req.subscription;

        if (!subscription) {
            return res.status(403).json({
                error: "Subscription required",
            });
        }

        if (requiredTier === "premium" && subscription.tier !== "premium") {
            return res.status(403).json({
                error: "Premium subscription required",
            });
        }

        next();
    };
};
