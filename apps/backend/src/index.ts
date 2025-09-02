import express from "express";
import dotenv from 'dotenv'
import { connectDb } from "./config/db.js";
import { userRouter } from "./services/user/routers/user.routes.js";
import http from "http"
import { Server, Socket } from "socket.io";
import cors from "cors"
import cookieParser from "cookie-parser";
// import { MessagePayload } from "./services/chat/message.types.js";
import { profileRouter } from "./services/user/routers/profile.routes.js";
import { friendRouter } from "./services/user/routers/friend.routes.js";

dotenv.config()
connectDb()
const app = express()
const PORT = process.env.PORT
app.use(express.json());
app.use(cookieParser());
app.use(cors())
const server = http.createServer(app)

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

io.on("connection", (socket:Socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    socket.on("join", (userId:string) => {
        socket.join(userId)
        console.log(`User ${userId} joined their private room`);
    })

    socket.on("joinGroup", (chatId:string) => {
        socket.join(chatId)
        console.log(`User joined group chat ${chatId}`);
    })

    socket.on("typing",({ roomId, userId, username }:{ roomId:string, userId:string, username:string }) => { 
        socket.to(roomId).emit("typing", {
            userId,
            username
        })
    })

    socket.on("stopTyping", ({ roomId, userId }:{ roomId:string, userId:string }) => {
        socket.to(roomId).emit("stopTyping", { userId });
    })

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`); 
    })
})


app.use("/api/user", userRouter)
app.use("/api/profile", profileRouter)
app.use("/api/friend", friendRouter)

app.get("/", (_, res) => {
    res.send("Backend working")
})

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})