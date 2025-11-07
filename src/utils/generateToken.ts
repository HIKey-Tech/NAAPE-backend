import jwt from "jsonwebtoken";

export const generateToken = (id: string, role: "admin" | "editor" | "member") => { 
    return jwt.sign({ id, role }, process.env.JWT_SECRET || "", { expiresIn: "30d" });
}