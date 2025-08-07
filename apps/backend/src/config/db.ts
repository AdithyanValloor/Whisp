import {connect} from "mongoose";
import dotenv from 'dotenv'

dotenv.config()

console.log(process.env.MONGO_URI);

export const connectDb = async () => {
    try {
        const con = await connect(process.env.MONGO_URI!)
        console.log(`MongoDB connected: ${con.connection.host}`)
    } catch (error) {
        console.error(`MongoDB connection error: ${(error as Error).message}`)
          process.exit(1)
    }
}