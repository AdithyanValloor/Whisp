import { Request } from "express";
import { DecodedUser } from "./user.types.js";

/**
 * Authenticated Request
 * ---------------------
 * Extends Express Request by attaching the decoded JWT user.
 *
 * Generic parameters allow strict typing for:
 * - Params
 * - Response body
 * - Request body
 * - Query
 */
export interface AuthRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: DecodedUser;
}
