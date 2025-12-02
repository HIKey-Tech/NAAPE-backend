import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes"
import publicationRoutes from "./routes/publication.routes"
import statsRoutes from "./routes/stats.routes";
import membersRoutes from "./routes/members.stats";
import commentRoutes from "./routes/comment.routes";
import notificationRoutes from "./routes/notification.routes";
import newsRoutes from "./routes/news.routes";
import eventRoutes from "./routes/events.routes"
import paymentRoutes from "./routes/payment.routes";





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

//publication route
app.use("/api/publications", publicationRoutes)

//test route
app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to NAAPE API");
});

//admin stats route
app.use("/api/stats", statsRoutes);

//member stats route
app.use("/api/member-dashboard", membersRoutes);

//users comment route
app.use("/api/comments", commentRoutes);

//notification route
app.use("/api/notifications", notificationRoutes);

//news route
app.use("/api/news", newsRoutes);

//events route
app.use("/api/events", eventRoutes);

//payment route
app.use("/api/payments", paymentRoutes);






//listen to port
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));