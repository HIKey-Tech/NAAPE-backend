import UserDocument from "../../models/User";

declare global {
    namespace Express {
        interface Request {
            // `any` will avoid type conflicts with other @types/express declarations.
            user?: any;
        }
    }
}