import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import authRoutes from "./routes/v1/auth.routes";
import userRoutes from "./routes/v1/user.routes"
import publicationRoutes from "./routes/v1/publication.routes"
import statsRoutes from "./routes/v1/stats.routes";
import membersRoutes from "./routes/v1/members.stats";
import commentRoutes from "./routes/v1/comment.routes";
import notificationRoutes from "./routes/v1/notification.routes";
import newsRoutes from "./routes/v1/news.routes";
import eventRoutes from "./routes/v1/events.routes"
import paymentRoutes from "./routes/v1/payment.routes";
import titleRoutes from "./routes/v1/ai.title";
import membershipFormRoutes from "./routes/v1/membershipform.routes"


// === Rate Limiting Middleware Setup ===
import { apiLimiter, authLimiter } from "./utils/rate.limiting";
import { errorHandler } from "./middleware/auth.middleware";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://naape-frontend.onrender.com",
        "https://naape.ng",
        "https://www.naape.ng",

    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

app.use(express.json());

app.use(helmet());

// Apply rate limiting globally (for all requests)
// app.use(apiLimiter);

//connect to database
connectDB();

//duplicate key error handler
app.use(errorHandler);

//auth route (add stricter auth limiter for login routes)
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/users", userRoutes)

//publication route
app.use("/api/v1/publications", publicationRoutes)

//test route
app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to NAAPE API");
});

//admin stats route
app.use("/api/v1/stats", statsRoutes);

//member stats route
app.use("/api/v1/member-dashboard", membersRoutes);

//users comment route
app.use("/api/v1/comments", commentRoutes);

//notification route
app.use("/api/v1/notifications", notificationRoutes);

//news route
app.use("/api/v1/news", newsRoutes);

//events route
app.use("/api/v1/events", eventRoutes);

//payment route
app.use("/api/v1/payments", paymentRoutes);


app.use("/api/v1/ai-title", titleRoutes);

//email route
app.use("/api/v1/membership-form", membershipFormRoutes)

//listen to port
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));