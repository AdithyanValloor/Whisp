import mongoose, { FilterQuery, Types } from "mongoose";
import { Chat } from "../../chat/models/chat.model.js";
import { IMessage, Message } from "../models/message.model.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
  Forbidden,
} from "../../../utils/errors/httpErrors.js";
import { extractFirstUrl } from "../utils/linkPreview.js";
import { BlockModel } from "../../user/models/block.model.js";
import { ChatUserStateModel } from "../../chat/models/chatUserState.model.js";
import { createInboxNotification } from "../../notifications/services/inboxNotification.service.js";
import { emitMessageRequestSent } from "../../../socket/emitters/messageRequest.emitters.js";
import { MessageRequestModel } from "../../user/models/messageRequest.model.js";
import { UserModel } from "../../user/models/user.model.js";

/**
 * Parses @mention user IDs from content and validates they are group members.
 * Returns only valid memberIds. Silently drops invalid ones.
 * Throws BadRequest if mentions are used in a DM.
 */
const resolveMentions = (
  rawMentionIds: string[] | undefined,
  chat: { isGroup: boolean; members: Types.ObjectId[] },
): Types.ObjectId[] => {
  if (!rawMentionIds || rawMentionIds.length === 0) return [];

  if (!chat.isGroup) {
    throw BadRequest("Mentions are only allowed in group chats");
  }

  const memberIdSet = new Set(chat.members.map((m) => m.toString()));

  return rawMentionIds
    .filter((id) => memberIdSet.has(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

/** Returns the chat user state for a given user/chat pair, or null if none exists. */
export const getChatUserState = async (userId: string, chatId: string) => {
  return ChatUserStateModel.findOne({ userId, chatId });
};

/**
 * Returns paginated messages for a chat, sorted newest-first.
 * Respects `clearedAt` — messages before that timestamp are excluded.
 *
 * @throws {Forbidden} If user is not a member of the chat.
 */

export const getAllMessagesFunction = async (
  chatId: string,
  userId: string,
  page: number,
  limit: number,
) => {
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findOne({
    _id: chatId,
    members: userId,
  });

  if (!chat) {
    throw Forbidden("Not allowed to access this chat");
  }

  const state = await getChatUserState(userId, chatId);

  const skip = (page - 1) * limit;

  const filter: FilterQuery<IMessage> = { chat: chatId };

  if (state?.clearedAt) {
    filter.createdAt = { $gt: state.clearedAt };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture")
    .populate("chat", "_id chatName isGroup");

  const total = await Message.countDocuments(filter);

  return {
    messages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

/**
 * Returns unread message counts for all chats the user belongs to.
 * Keyed by chatId. Used on app bootstrap and socket reconnect.
 *
 * @throws {Unauthorized} If userId is missing.
 */

export const getUnreadCountsFunction = async (userId: string) => {
  if (!userId) throw Unauthorized();

  // Get all chats the user belongs to
  const userChats = await Chat.find({ members: userId }).select("_id");
  const chatIds = userChats.map((c) => c._id.toString());

  if (chatIds.length === 0) return {};

  // Get existing states (may not exist for new accounts)
  const states = await ChatUserStateModel.find({
    userId,
    chatId: { $in: chatIds },
  });

  const stateMap = new Map(states.map((s) => [s.chatId.toString(), s]));

  const unreadData: Record<string, number> = {};

  for (const chatId of chatIds) {
    const state = stateMap.get(chatId);

    const filter: FilterQuery<IMessage> = {
      chat: chatId,
      deleted: false,
      sender: { $ne: userId },
      createdAt: {
        $gt: state?.lastReadAt ?? state?.clearedAt ?? new Date(0),
      },
    };

    const count = await Message.countDocuments(filter);
    unreadData[chatId] = count;
  }

  return unreadData;
};

// export const getUnreadCountsFunction = async (userId: string) => {
//   if (!userId) throw Unauthorized();

//   const states = await ChatUserStateModel.find({ userId });

//   const unreadData: Record<string, number> = {};

//   for (const state of states) {
//     const filter: FilterQuery<IMessage> = {
//       chat: state.chatId,
//       deleted: false,
//       sender: { $ne: userId },
//       createdAt: {
//         $gt: state.lastReadAt || state.clearedAt || new Date(0),
//       },
//     };

//     const count = await Message.countDocuments(filter);
//     unreadData[state.chatId.toString()] = count;
//   }

//   return unreadData;
// };

/**
 * Creates a message in a chat and increments unread counts for all other members.
 * Block checks are enforced for DMs. Socket emissions handled by the controller.
 *
 * @returns Populated message, raw members list, updated unread counts, and extracted URL if any.
 * @throws {Forbidden} If sender is not a member, or a block exists in a DM.
 */
export const sendMessageFunction = async (
  chatId: string,
  content: string,
  senderId: string,
  replyTo?: string | null,
  mentionIds?: string[],
) => {
  if (!senderId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");
  if (!content) throw BadRequest("Message content is required");

  const chat = await Chat.findOne({
    _id: chatId,
    members: senderId,
  });

  if (!chat) throw Forbidden("Not allowed to send message in this chat");

  if (!chat.isGroup) {
    const otherMember = chat.members
      .map((m) => m.toString())
      .find((id) => id !== senderId);

    if (otherMember) {
      const blockExists = await BlockModel.findOne({
        $or: [
          { blocker: otherMember, blocked: senderId },
          { blocker: senderId, blocked: otherMember },
        ],
      });

      if (blockExists) {
        throw Forbidden("Cannot send message to this user");
      }
    }
  }

  const deliveredTo = chat.members.filter((id) => id.toString() !== senderId);

  const firstUrl = extractFirstUrl(content);

  const resolvedMentions = resolveMentions(mentionIds, chat);

  const message = await Message.create({
    sender: senderId,
    content,
    chat: chatId,
    deliveredTo,
    replyTo: replyTo || null,
    linkPreview: null,
    mentions: resolvedMentions,
  });

  const uniqueMentions = new Set(resolvedMentions.map((id) => id.toString()));

  if (replyTo) {
    const repliedMessage = await Message.findById(replyTo);

    if (repliedMessage) {
      const replyUserId = repliedMessage.sender.toString();

      if (replyUserId !== senderId) {
        await createInboxNotification({
          userId: replyUserId,
          actorId: senderId,
          type: "reply",
          chatId,
          messageId: message._id.toString(),
        });
      }
    }
  }

  const populated = await message.populate([
    { path: "sender", select: "displayName username profilePicture" },
    {
      path: "replyTo",
      select: "content sender",
      populate: {
        path: "sender",
        select: "username displayName",
      },
    },
  ]);

  // Update unread counts
  chat.lastMessage = message._id;
  await chat.save();

  if (
    !chat.isGroup &&
    chat.requestPending &&
    chat.requestInitiator?.toString() === senderId
  ) {
    const toUserId = chat.members
      .map((m) => m.toString())
      .find((id) => id !== senderId);

    if (toUserId) {
      const existing = await MessageRequestModel.findOne({
        from: senderId,
        to: toUserId,
        status: "pending",
      });

      if (!existing) {
        const request = await MessageRequestModel.create({
          from: senderId,
          to: toUserId,
          firstMessage: content,
        });

        const populatedRequest = await request.populate([
          { path: "from", select: "username displayName profilePicture" },
          { path: "to", select: "username displayName profilePicture" },
        ]);

        emitMessageRequestSent(senderId, toUserId, populatedRequest);
      }
    }
  }

  const memberIds = chat.members.map((m) => m.toString());

  await Promise.all(
    [...uniqueMentions]
      .filter((id) => id !== senderId && memberIds.includes(id))
      .map((userId) =>
        createInboxNotification({
          userId,
          actorId: senderId,
          type: "mention",
          chatId,
          messageId: message._id.toString(),
        }),
      ),
  );

  const states = await ChatUserStateModel.find({
    chatId,
    userId: { $in: memberIds },
  });

  const stateMap = new Map(states.map((s) => [s.userId.toString(), s]));

  const unreadCounts: Record<string, number> = {};

  for (const member of memberIds) {
    if (member === senderId) continue;

    const state = stateMap.get(member);
    const boundary = state?.lastReadAt ?? state?.clearedAt ?? new Date(0);

    const count = await Message.countDocuments({
      chat: chatId,
      deleted: false,
      sender: { $ne: member },
      createdAt: { $gt: boundary },
    });

    unreadCounts[member] = count;
  }

  return {
    populated,
    messageId: message._id.toString(),
    firstUrl,
    chatMembers: chat.members.map((m) => m.toString()),
    unreadCounts,
    mentionedUserIds: resolvedMentions.map((id) => id.toString()),
  };
};

/**
 * Duplicates a message into one or more target chats.
 * Silently skips chats where the sender is not a member or a block exists.
 * Socket emissions handled by the controller.
 *
 * @returns Array of results per chat — populated message, members, and unread counts.
 * @throws {Forbidden} If sender is not a member of the origin chat.
 */

export const forwardMessageFunction = async (
  messageId: string,
  targetChatIds: string[],
  senderId: string,
) => {
  if (!senderId) throw Unauthorized();
  if (!messageId) throw BadRequest("MessageId is required");
  if (!targetChatIds || targetChatIds.length === 0)
    throw BadRequest("At least one target chat is required");

  const original = await Message.findById(messageId);

  if (!original) throw NotFound("Original message not found");

  const originChat = await Chat.findOne({
    _id: original.chat,
    members: senderId,
  });

  if (!originChat) {
    throw Forbidden("Not allowed to forward this message");
  }

  const results = [];

  for (const chatId of targetChatIds) {
    const chat = await Chat.findOne({ _id: chatId, members: senderId });
    if (!chat) continue;

    if (!chat.isGroup) {
      const otherMember = chat.members.find((m) => m.toString() !== senderId);

      if (otherMember) {
        const blockExists = await BlockModel.findOne({
          $or: [
            { blocker: otherMember, blocked: senderId },
            { blocker: senderId, blocked: otherMember },
          ],
        });

        if (blockExists) {
          continue;
        }
      }
    }

    const deliveredTo = chat.members.filter((id) => id.toString() !== senderId);

    const forwardedMessage = await Message.create({
      chat: chatId,
      sender: senderId,
      content: original.content,
      deliveredTo,
      forwarded: true,
      forwardedFrom: original._id,
      linkPreview: original.linkPreview || null,
    });

    chat.lastMessage = forwardedMessage._id;

    await chat.save();

    const populated = await forwardedMessage.populate([
      { path: "sender", select: "displayName username profilePicture" },
      {
        path: "forwardedFrom",
        select: "content sender",
        populate: {
          path: "sender",
          select: "username displayName profilePicture",
        },
      },
    ]);

    const memberIds = chat.members.map((m) => m.toString());

    const states = await ChatUserStateModel.find({
      chatId,
      userId: { $in: memberIds },
    });

    const stateMap = new Map(states.map((s) => [s.userId.toString(), s]));

    const unreadCounts: Record<string, number> = {};

    for (const member of memberIds) {
      if (member === senderId) continue;

      const state = stateMap.get(member);
      const boundary = state?.lastReadAt || state?.clearedAt || new Date(0);

      const count = await Message.countDocuments({
        chat: chatId,
        deleted: false,
        sender: { $ne: member },
        createdAt: { $gt: boundary },
      });

      unreadCounts[member] = count;
    }

    results.push({
      chatId,
      message: populated,
      chatMembers: chat.members.map((m) => m.toString()),
      unreadCounts,
    });
  }

  return results;
};

/**
 * Toggles a reaction on a message. Same emoji removes it; different emoji replaces it.
 * Block checks are enforced for DMs. Socket emissions handled by the controller.
 *
 * @returns Populated message with updated reactions and the chatId.
 * @throws {Forbidden} If a block exists in a DM.
 */
export const toggleReactionFunction = async (
  messageId: string,
  userId: string,
  emoji: string,
) => {
  if (!userId) throw Unauthorized();
  if (!emoji) throw BadRequest("Emoji is required");

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  const chat = await Chat.findById(message.chat);
  if (!chat) throw Forbidden("Chat does not exist");

  if (!chat?.isGroup) {
    const otherMember = chat.members
      .map((m) => m.toString())
      .find((id) => id !== userId);

    if (otherMember) {
      const blockExists = await BlockModel.findOne({
        $or: [
          { blocker: otherMember, blocked: userId },
          { blocker: userId, blocked: otherMember },
        ],
      });

      if (blockExists) {
        throw Forbidden("Cannot interact in this chat");
      }
    }
  }

  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.user.toString() === userId,
  );

  if (existingReactionIndex !== -1) {
    const existingReaction = message.reactions[existingReactionIndex];

    if (existingReaction.emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({
      emoji,
      user: new mongoose.Types.ObjectId(userId),
    });
  }

  await message.save();

  const populated = await message.populate([
    { path: "sender", select: "displayName username profilePicture" },
    { path: "reactions.user", select: "username displayName profilePicture" },
  ]);

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * Resets the unread count for a user in a given chat.
 * Socket emissions handled by the controller.
 *
 * @throws {NotFound} If the chat does not exist.
 */
export const markChatAsReadFunction = async (
  userId: string,
  chatId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findOne({ _id: chatId, members: userId });
  if (!chat) throw Forbidden("Not allowed");

  const latestMessage = await Message.findOne({
    chat: chatId,
    deleted: false,
  })
    .sort({ createdAt: -1 })
    .select("createdAt");

  if (!latestMessage) {
    return { unreadCount: 0 };
  }

  await ChatUserStateModel.findOneAndUpdate(
    { userId, chatId },
    { lastReadAt: latestMessage.createdAt },
    { upsert: true },
  );

  return { unreadCount: 0 };
};

/**
 * Marks all unread messages in a chat as seen by the user and resets their unread count.
 * Also removes the user from `deliveredTo` on those messages.
 * Socket emissions handled by the controller.
 *
 * @returns `{ success: true, modifiedCount }`.
 */
export const markMessagesAsSeenFunction = async (
  userId: string,
  chatId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!chatId) throw BadRequest("ChatId is required");

  const chat = await Chat.findOne({ _id: chatId, members: userId });
  if (!chat) throw Forbidden("Not allowed");

  // Check the user's read receipt privacy setting
  const user = await UserModel.findById(userId).select("privacy");
  const readReceiptsEnabled = user?.privacy?.readReceipts ?? true;

  const latestIncomingMessage = await Message.findOne({
    chat: chatId,
    deleted: false,
    sender: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .select("createdAt");

  // Always update lastReadAt for unread count tracking — this is internal
  if (latestIncomingMessage) {
    await ChatUserStateModel.findOneAndUpdate(
      { userId, chatId },
      { lastReadAt: latestIncomingMessage.createdAt },
      { upsert: true },
    );
  }

  // Only write seenBy and pull deliveredTo if read receipts are on
  // If off — others won't see the "seen" status, but unread counts still clear
  if (readReceiptsEnabled) {
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, seenBy: { $ne: userId } },
      { $addToSet: { seenBy: userId } },
    );

    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, deliveredTo: userId },
      { $pull: { deliveredTo: userId } },
    );
  }

  const updated = await Message.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    seenBy: { $ne: userId },
  });

  // Return whether receipts are enabled so the controller
  // knows whether to emit the seen socket event to others
  return {
    success: true,
    modifiedCount: updated,
    emitSeen: readReceiptsEnabled, // ← controller uses this
  };
};

/**
 * Updates message content in-place and sets `edited = true`.
 * Only the original sender may edit. Socket emissions handled by the controller.
 *
 * @returns Populated message and chatId.
 * @throws {Forbidden} If the requester is not the sender.
 */
export const editMessageFunction = async (
  messageId: string,
  newContent: string,
  userId: string,
) => {
  if (!userId) throw Unauthorized();
  if (!newContent) throw BadRequest("Content is required");

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  if (message.sender.toString() !== userId) {
    throw Forbidden("Not authorized to edit this message");
  }

  message.content = newContent;
  message.edited = true;
  await message.save();

  const populated = await message.populate("sender", "username profilePicture");

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * Soft-deletes a message: replaces content with a placeholder and clears all metadata.
 * The document is retained for audit purposes. Socket emissions handled by the controller.
 *
 * @returns Populated message and chatId.
 * @throws {Forbidden} If the requester is not the sender.
 */
export const deleteMessageFunction = async (
  messageId: string,
  userId: string,
) => {
  if (!userId) throw Unauthorized();

  const message = await Message.findById(messageId);
  if (!message) throw NotFound("Message not found");

  if (message.sender.toString() !== userId) {
    throw Forbidden("Not authorized to delete this message");
  }

  message.content = "This message was deleted";
  message.deleted = true;
  message.edited = false;
  message.replyTo = null;
  message.forwarded = false;
  message.forwardedFrom = null;
  message.reactions = [];
  message.linkPreview = undefined;

  await message.save();

  const populated = await message.populate(
    "sender",
    "username displayName profilePicture",
  );

  return {
    populated,
    chatId: message.chat.toString(),
  };
};

/**
 * Searches messages in a chat by text and/or date.
 * Text search is scored via MongoDB `$text`; date filters to a full calendar day.
 * Respects `clearedAt`. Results are paginated.
 *
 * @returns Paginated messages with `hasMore` flag.
 * @throws {Forbidden} If user is not a member of the chat.
 */
export const searchMessagesFunction = async (
  chatId: string,
  userId: string,
  query?: string,
  date?: string,
  page: number = 1,
  limit: number = 20,
) => {
  if (!chatId) throw BadRequest("ChatId is required");
  if (!userId) throw Unauthorized();

  const chat = await Chat.findOne({
    _id: chatId,
    members: userId,
  });

  if (!chat) throw Forbidden("Not allowed to search this chat");

  const state = await getChatUserState(userId, chatId);
  const skip = (page - 1) * limit;

  const filter: FilterQuery<IMessage> = { chat: chatId, deleted: false };

  if (state?.clearedAt) {
    filter.createdAt = { $gt: state.clearedAt };
  }

  if (query?.trim()) {
    filter.$text = { $search: query };
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: state?.clearedAt
        ? new Date(Math.max(start.getTime(), state.clearedAt.getTime()))
        : start,
      $lte: end,
    };
  }

  const messages = await Message.find(
    filter,
    query ? { score: { $meta: "textScore" } } : {},
  )
    .sort(
      query
        ? { score: { $meta: "textScore" }, createdAt: -1 }
        : { createdAt: -1 },
    )
    .skip(skip)
    .limit(limit)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture");

  const total = await Message.countDocuments(filter);

  return {
    messages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hasMore: skip + messages.length < total,
  };
};

/**
 * Fetches a target message plus up to `limit` messages before and after it.
 * Used for jump-to-message from search results, reply clicks, and deep links.
 * Respects `clearedAt` — throws if the target itself is before that boundary.
 *
 * @returns `{ target, before, after }` — `before` is in ascending order.
 * @throws {Forbidden} If user is not a member or the message is before `clearedAt`.
 */
export const getMessageContextFunction = async (
  messageId: string,
  userId: string,
  limit: number = 20,
) => {
  const populateConfig = [
    { path: "sender", select: "username displayName profilePicture" },
    {
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    },
    { path: "reactions.user", select: "username displayName profilePicture" },
  ];

  const target = await Message.findById(messageId).populate(populateConfig);
  if (!target) throw NotFound("Message not found");

  const chat = await Chat.findOne({ _id: target.chat, members: userId });
  if (!chat) throw Forbidden("Not allowed");

  const state = await getChatUserState(userId, target.chat.toString());

  if (state?.clearedAt && target.createdAt <= state.clearedAt) {
    throw Forbidden("Message no longer accessible");
  }

  const beforeFilter: FilterQuery<IMessage> = {
    chat: target.chat.toString(),
    createdAt: {
      $lt: target.createdAt,
      ...(state?.clearedAt && { $gt: state.clearedAt }),
    },
  };

  const afterFilter: FilterQuery<IMessage> = {
    chat: target.chat.toString(),
    createdAt: {
      $gt: state?.clearedAt
        ? new Date(
            Math.max(target.createdAt.getTime(), state.clearedAt.getTime()),
          )
        : target.createdAt,
    },
  };

  const [before, after] = await Promise.all([
    Message.find(beforeFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(populateConfig),
    Message.find(afterFilter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate(populateConfig),
  ]);

  return { target, before: before.reverse(), after };
};

/**
 * Fetches messages created after a given timestamp in a chat.
 * Used for incremental loading when the user scrolls to recent messages.
 * Respects `clearedAt`.
 *
 * @param after - ISO timestamp string acting as the lower bound (exclusive).
 * @returns Messages in ascending order and a `hasMore` flag.
 * @throws {Forbidden} If user is not a member of the chat.
 */
export const getNewerMessagesFunction = async (
  chatId: string,
  after: string,
  userId: string,
  limit: number = 20,
) => {
  const chat = await Chat.findOne({ _id: chatId, members: userId });
  if (!chat) throw Forbidden("Not allowed");

  const afterDate = new Date(after);
  const state = await getChatUserState(userId, chatId);

  const filter: FilterQuery<IMessage> = {
    chat: chatId,
    createdAt: {
      $gt: state?.clearedAt
        ? new Date(Math.max(afterDate.getTime(), state.clearedAt.getTime()))
        : afterDate,
    },
  };

  const messages = await Message.find(filter)
    .sort({ createdAt: 1 })
    .limit(limit + 1)
    .populate("sender", "displayName username profilePicture")
    .populate({
      path: "replyTo",
      select: "content sender createdAt",
      populate: {
        path: "sender",
        select: "username displayName profilePicture",
      },
    })
    .populate("reactions.user", "username displayName profilePicture");

  const hasMore = messages.length > limit;

  if (hasMore) {
    messages.pop();
  }

  return { messages, hasMore };
};

/**
 * Searches messages across all chats the user is a member of.
 * Respects clearedAt per chat. Returns top results grouped by chat.
 */
export const globalSearchMessagesFunction = async (
  userId: string,
  query: string,
  limit: number = 20,
) => {
  if (!userId) throw Unauthorized();
  if (!query?.trim()) throw BadRequest("Query is required");

  // Get all chats user belongs to
  const userChats = await Chat.find({ members: userId }).select("_id");
  const chatIds = userChats.map((c) => c._id);

  // Get all user states to respect clearedAt per chat
  const states = await ChatUserStateModel.find({
    userId,
    chatId: { $in: chatIds },
  });
  const stateMap = new Map(states.map((s) => [s.chatId.toString(), s]));

  // Build per-chat clearedAt exclusion conditions
  const chatConditions = chatIds.map((chatId) => {
    const state = stateMap.get(chatId.toString());
    const condition: FilterQuery<IMessage> = { chat: chatId };
    if (state?.clearedAt) {
      condition.createdAt = { $gt: state.clearedAt };
    }
    return condition;
  });

  if (chatConditions.length === 0) return { messages: [] };

  const messages = await Message.find(
    {
      $and: [
        { $or: chatConditions },
        { $text: { $search: query } },
        { deleted: false },
      ],
    },
    { score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" }, createdAt: -1 })
    .limit(limit)
    .populate({
      path: "chat",
      select: "_id chatName isGroup members",
      populate: {
        path: "members",
        select: "_id username displayName",
      },
    })
    .populate("sender", "displayName username profilePicture");

  return { messages };
};
