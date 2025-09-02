import { Request, Response, NextFunction } from "express"
import { verifyAccessToken,  verifyRefreshToken, generateAccessToken } from "../../utils/jwt.js"
import { DecodedUser } from "../user/user.types.js"

declare global {
    namespace Express {
        interface Request {
            user?: DecodedUser
        }
    }
}

export const protect = (req: Request, res: Response, next: NextFunction):void => {
    try {
        let accessToken = 
        req.cookies?.accessToken || 
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined)

        if (!accessToken) {
            res.status(401).json({ error: "No token provided" });
            return 
        }

        try {
            const decoded = verifyAccessToken(accessToken) as DecodedUser
            
            console.log("Decoded :", decoded);
            
            req.user = decoded;
            next();
            return 
        } catch (accessErr) {
            const refreshToken = req.cookies?.refreshToken

            if(!refreshToken){
                res.status(401).json({error: "Access token expired. No refresh token found"})
                return 
            }

            try {
                const decodedRefresh = verifyRefreshToken(refreshToken) as DecodedUser

                const newAccessToken = generateAccessToken(decodedRefresh);

                res.cookie("accessToken", newAccessToken , {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 15 * 60 * 1000,
                })

                req.user = decodedRefresh; 
                next();
                return 

            } catch (refreshError) {
                res.status(403).json({ error: "Invalid or expired refresh token" });
                return 
            }
        }

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
        return 
    }
}

