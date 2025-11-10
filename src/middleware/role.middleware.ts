import { Request, Response, NextFunction } from "express";

export const authorizeRoles = (...roles: string[]) => { 
    return (req: Request & { user?: { role?: string } }, res: Response, next: NextFunction) => {

        const user = req.user;
        if (!user) {
            return res.status(401).json({ message:"Unauthorized"})
        }

        if (!roles.includes(req.user?.role as string)) {
            return res.status(403).json({ message: "Access denied: Acess denied" });
        }
        next();
    }
}