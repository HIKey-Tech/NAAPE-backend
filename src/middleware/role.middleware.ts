import { Request, Response, NextFunction } from "express";

export const authorizeRoles = (...roles: string[]) => { 
    return (req: Request & { user?: { role?: string } }, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role as string)) {
            return res.status(403).json({ message: "Access denied: insufficient privileges" });
        }
        next();
    }
}