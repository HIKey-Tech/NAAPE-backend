import { Request, Response} from "express";

export abstract class BaseController {
    protected ok<T>(res: Response, data: T) {
        return res.status(200).json({
            success: true,
        });
    }

    protected created<T>(res: Response, data: T) {
        return res.status(201).json({
            success: true,
            data,
        })
    }

    protected fail(res: Response, error: string, code: 400) {
        return res.status(code).json({
            success: false,
            error
        })
    }

    abstract execute(req: Request, res: Response): Promise<void>;
}