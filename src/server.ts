import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes"; 
import userRoutes from "./routes/user.routes"


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

//connect to database
connectDB();

//auth route
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)

//test route
app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to NAAPE API");
});

//listen to port
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));