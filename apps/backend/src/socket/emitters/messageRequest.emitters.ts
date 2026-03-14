/**
 * ------------------------------------------------------------------
 * Whisp Chat Backend - Message Request Socket Emitters
 * ------------------------------------------------------------------
 *
 * Purpose:
 *  Centralized real-time emitters for message request events.
 *
 * Effects:
 *  - Instantly update request lists
 *  - Notify sender / receiver
 *  - Allow UI to react without polling
 */

import { IChat } from "../../services/chat/models/chat.model.js";
import { IMessageRequest } from "../../services/user/models/messageRequest.model.js";
import { getIO } from "../io.js";

/**
 * ------------------------------------------------------------------
 * Emit when a message request is sent
 * ------------------------------------------------------------------
 *
 * Receiver:
 *   → gets new request in "incoming"
 *
 * Sender:
 *   → gets request added to "outgoing"
 */

export const emitMessageRequestSent = (
  fromUserId: string,
  toUserId: string,
  request: IMessageRequest
) => {

  const io = getIO();

  io.to(toUserId).emit("message_request_received", request);

  io.to(fromUserId).emit("message_request_sent", request);

};


/**
 * ------------------------------------------------------------------
 * Emit when a message request is accepted
 * ------------------------------------------------------------------
 *
 * Both users:
 *   → remove request
 *   → open new chat
 */

export const emitMessageRequestAccepted = (
  fromUserId: string,
  toUserId: string,
  payload: {
    requestId: string
    chat: IChat
  }
) => {

  const io = getIO();

  io.to(fromUserId).emit("message_request_accepted", payload);

  io.to(toUserId).emit("message_request_accepted", payload);

};


/**
 * ------------------------------------------------------------------
 * Emit when a message request is rejected
 * ------------------------------------------------------------------
 *
 * Sender:
 *   → request disappears from outgoing
 */

export const emitMessageRequestRejected = (
  fromUserId: string,
  requestId: string,
  chatId: string
) => {

  const io = getIO();

  io.to(fromUserId).emit("message_request_rejected", {
    requestId, 
    chatId
  });

};