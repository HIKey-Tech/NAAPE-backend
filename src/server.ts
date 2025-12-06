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

// === Rate Limiting Middleware Setup ===
import { apiLimiter, authLimiter } from "./utils/rate.limiting";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Apply rate limiting globally (for all requests)
app.use(apiLimiter);

//connect to database
connectDB();

//auth route (add stricter auth limiter for login routes)
app.use("/api/auth", authLimiter, authRoutes);
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
app.use("/api/news", apiLimiter, newsRoutes);

//events route
app.use("/api/events", apiLimiter, eventRoutes);

//payment route
app.use("/api/payments", apiLimiter, paymentRoutes);

//listen to port
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));