import express from "express";
import dotenv from 'dotenv'
import { connectDb } from "./config/db.js";
import { userRouter } from "./services/user/routers/user.routes.js";
import http from "http"
import { Server as socketIOServer } from "socket.io";
import cors from "cors"
import cookieParser from "cookie-parser";
import { MessagePayload } from "./services/chat/message.types.js";
import { profileRouter } from "./services/user/routers/profile.routes.js";

dotenv.config()
connectDb()
const app = express()
const PORT = process.env.PORT
app.use(express.json());
app.use(cookieParser());
app.use(cors())
const server = http.createServer(app)

export const io = new socketIOServer(server, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true,
    }
})

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    socket.on("join", (userId) => {
        socket.join(userId)
        console.log(`User ${userId} joined their private room`);
    })

    socket.on("joinGroup", (chatId) => {
        socket.join(chatId)
        console.log(`User joined group chat ${chatId}`);
    })

    socket.on("typing",({ roomId, userId, username }) => { 
        socket.to(roomId).emit("typing", {
            userId,
            username
        })
    })

    socket.on("stopTyping", ({ roomId, userId }) => {
        socket.to(roomId).emit("stopTyping", { userId });
    })

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`); 
    })
})


app.use("/api/user", userRouter)
app.use("/api/profile", profileRouter)

app.get("/", (_, res) => {
    res.send("Backend working")
})

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})