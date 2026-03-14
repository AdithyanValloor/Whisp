import { IUser, UserModel } from "../../user/models/user.model.js";
import { areFriends } from "../../user/utils/friend.utils.js";
import { BlockModel } from "../../user/models/block.model.js";
import { Chat } from "../../chat/models/chat.model.js";
import { Message } from "../models/message.model.js";
import {
  BadRequest,
  NotFound,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";
import { MessageRequestModel } from "../../user/models/messageRequest.model.js";

export const getMessageRequests = async (userId: string) => {
  const incoming = await MessageRequestModel.find({
    status: "pending",
    to: userId,
  }).populate("from to", "username displayName profilePicture");

  return { incoming };
};

export const sendMessageRequest = async (
  fromUserId: string,
  toUserId: string,
  firstMessage: string,
) => {
  if (!firstMessage) throw BadRequest("Message required");

  const toUser = await UserModel.findById(toUserId);

  if (!toUser) throw NotFound("User not found");

  if (toUser._id.toString() === fromUserId)
    throw BadRequest("Cannot message yourself");

  const blocked = await BlockModel.findOne({
    $or: [
      { blocker: fromUserId, blocked: toUser._id },
      { blocker: toUser._id, blocked: fromUserId },
    ],
  });

  if (blocked) throw Forbidden("Cannot message this user");

  const friends = await areFriends(fromUserId, toUser._id.toString());

  if (friends) throw BadRequest("Users are already friends");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailyCount = await MessageRequestModel.countDocuments({
    from: fromUserId,
    createdAt: { $gte: startOfDay },
  });

  if (dailyCount >= 20) {
    throw Forbidden("Too many message requests today");
  }

  const existing = await MessageRequestModel.findOne({
    from: fromUserId,
    to: toUser._id,
    status: "pending",
  });
  if (existing) throw BadRequest("Message request already pending");

  const request = await MessageRequestModel.create({
    from: fromUserId,
    to: toUser._id,
    firstMessage,
  });

  const populated = await request.populate([
    { path: "from", select: "username displayName profilePicture" },
    { path: "to", select: "username displayName profilePicture" },
  ]);

  return populated;
};

export const acceptMessageRequest = async (
  requestId: string,
  userId: string,
) => {
  const request = await MessageRequestModel.findById(requestId);

  if (!request) throw NotFound("Request not found");

  if (request.to.toString() !== userId) throw Forbidden("Not authorized");

  const chat = await Chat.findOne({
    isGroup: false,
    members: { $all: [request.from, request.to], $size: 2 },
    requestPending: true,
  });

  if (!chat) throw NotFound("Chat not found");

  chat.requestPending = false;
  await chat.save();

  const populated = await chat.populate<{ members: IUser[] }>(
    "members",
    "-password",
  );

  request.status = "accepted";
  await request.save();

  return { chat: populated };
};

export const rejectMessageRequest = async (
  requestId: string,
  userId: string,
) => {
  const request = await MessageRequestModel.findById(requestId);

  if (!request) throw NotFound("Request not found");

  if (request.to.toString() !== userId) throw Forbidden("Not authorized");

  const chat = await Chat.findOneAndDelete({
    isGroup: false,
    members: { $all: [request.from, request.to], $size: 2 },
    requestPending: true,
    requestInitiator: request.from,
  });

  if (!chat) throw NotFound("Chat not found");
  await Message.deleteMany({ chat: chat._id });

  request.status = "rejected";
  await request.save();

  return { request, chatId: chat._id.toString() };
};
