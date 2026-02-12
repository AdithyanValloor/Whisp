import { DecodedUser } from "../user/types/user.types.js"

declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

export {};