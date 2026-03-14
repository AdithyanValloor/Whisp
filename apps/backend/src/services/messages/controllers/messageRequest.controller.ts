import { Request, Response } from "express";
import * as service from "../services/messageRequest.service.js";
import {
  emitMessageRequestAccepted,
  emitMessageRequestRejected,
} from "../../../socket/emitters/messageRequest.emitters.js";

export const getMessageRequestsController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;

  const requests = await service.getMessageRequests(userId);

  res.status(200).json({
    success: true,
    ...requests,
  });
};

export const acceptMessageRequestController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;
  const { requestId } = req.params;

  const result = await service.acceptMessageRequest(requestId, userId);

  const [userA, userB] = result.chat.members as any[];
  emitMessageRequestAccepted(userA._id.toString(), userB._id.toString(), {
    requestId,
    chat: result.chat as any,
  });
  res.status(200).json({
    success: true,
    ...result,
  });
};

export const rejectMessageRequestController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user.id;
  const { requestId } = req.params;

  const result = await service.rejectMessageRequest(requestId, userId);

  emitMessageRequestRejected(result.request.from.toString(), requestId, result.chatId);

  res.status(200).json({
    success: true,
    request: result,
  });
};
