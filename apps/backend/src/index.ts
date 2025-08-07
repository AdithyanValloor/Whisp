import express from "express";
import dotenv from 'dotenv'
import { connectDb } from "./config/db.js";
import { userRouter } from "./services/user/user.routes.js";
import http from "http"
import { Server as socketIOServer } from "socket.io";
import cors from "cors"
import cookieParser from "cookie-parser";
import { MessagePayload } from "./services/chat/message.types.js";

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

    socket.on("send message", (data: MessagePayload) => {
        const {receiverId, message} = data
        io.to(receiverId).emit("recieve message", {message, senderId: socket.id})
    })

    socket.on("typing",({ receiverId }) => {
        socket.to(receiverId).emit("typing", {senderId: socket.id})
    })

    socket.on("stop typing", ({ receiverId }) => {
        socket.to(receiverId).emit("stop typing", {senderId: socket.id})
    })

    socket.on("diconnect", () => {
        console.log(`Socket diconnected: ${socket.id}`); 
    })
})


console.log("PORT : ", PORT);

app.use("/api/user", userRouter)

app.get("/", (_, res) => {
    res.send("Backend working")
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})