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