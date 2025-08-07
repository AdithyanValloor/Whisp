import { Response, Request, NextFunction } from "express"

const rateMap = new Map<string, number>()

export const messageRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id
    const chatId = req.body.chatId
    const key = `${userId}-${chatId}`

    const now = Date.now()
    const last = rateMap.get(key)

    if(last && now - last < 1000){
        return res.status(429).json({ msg: "You're sending messages too fast"})
    }

    rateMap.set(key, now)
    next()
}

