import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/redux/store";

export const selectMessageIdsByChat = (
  state: RootState,
  chatId: string
) => state.messages.messages[chatId] ?? [];

export const selectMessagesByChat = createSelector(
  [
    (state: RootState, chatId: string) => state.messages.messages[chatId] ?? [],
    (state: RootState) => state.messages.byId,
  ],
  (ids, byId) => {
    const messages = ids.map((id) => byId[id]).filter(Boolean);
    console.log("🎯 Selector recomputed:", { 
      idsCount: ids.length, 
      messagesCount: messages.length,
      latestId: ids[ids.length - 1]
    });
    return messages;
  }
);

export const selectChatHasMention = (chatId: string) =>
  createSelector(
    [(state: RootState) => state.notifications.notifications],
    (notifications) =>
      notifications.some(
        (n) => n.type === "mention" && n.chat?._id === chatId && !n.read
      )
  );