import {Schema, model} from "mongoose";

export interface IUser extends Document {
    username: string
    email: string
    password: string
    createdAt: Date
    updatedAt: Date
}

const userSchema: Schema<IUser> = new Schema (
    {
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 3
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true,
            minlength: 8
        }
    },
    {
        timestamps: true
    }
)

export  const UserModel = model<IUser>("User", userSchema)