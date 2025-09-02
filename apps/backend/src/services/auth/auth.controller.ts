import { UserModel } from "../user/models/user.model.js";
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";

const HASH_SALT = 10

export const registerUser = async (username:string, email: string, password: string) => {

    // Check if user with the email already exist
    const existingUser = await UserModel.findOne({email})

    // Throw error if email already exists
    if(existingUser){
        throw new Error("Email already exists")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, HASH_SALT)

    // Create new user
    const newUser = await UserModel.create({
        username,
        email,
        password: hashedPassword
    })

    // Generate Token
    const accessToken = generateAccessToken({ id: newUser._id, email: newUser.email })
    const refreshToken = generateRefreshToken({ id: newUser._id, email: newUser.email })

    // Remove password from the user object
    const {password:_, ...safeUser} = newUser.toObject()

    // Return token & user object
    return {accessToken, refreshToken, safeUser}

}

export const loginUser = async (email: string, password: string) => {

    // Check if user exists
    const user = await UserModel.findOne({email})

    // Throw error if user doesn't exists
    if(!user){
        throw new Error("Invalid email or password")
    }

    // Compare password
    const isPasswordMatch = bcrypt.compare(password, user.password)

    // Throw error if password doesn't match
    if(!isPasswordMatch){
        throw new Error("Invalid email or password")
    }

    // Generate token
    const accessToken = generateAccessToken({ id: user._id, email: user.email })
    const refreshToken = generateRefreshToken({ id: user._id, email: user.email })

    // Remove password from the user object
    const {password:_, ...safeUser} = user.toObject()

    // Return token & user object
    return {accessToken, refreshToken, safeUser}

}