import { Request, Response, NextFunction } from "express"
import { verifyAccessToken,  verifyRefreshToken, generateAccessToken } from "../utils/jwt"
import { DecodedUser } from "../services/user/user.types"

declare global {
    namespace Express {
        interface Request {
            user?: DecodedUser
        }
    }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
    try {
        let accessToken = 
        req.cookies?.accessToken || 
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined)

        if (!accessToken) {
            return res.status(401).json({ error: "No token provided" });
        }

        try {
            const decoded = verifyAccessToken(accessToken) as DecodedUser
            req.user = decoded;
            return next();
        } catch (accessErr) {
            const refreshToken = req.cookies?.refreshToken

            if(!refreshToken){
                return res.status(401).json({error: "Access token expired. No refresh token found"})
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
                return next();

            } catch (refreshError) {
                return res.status(403).json({ error: "Invalid or expired refresh token" });
            }
        }

    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

