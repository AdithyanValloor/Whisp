export type MessagePayload = {
  receiverId: string
  message: string
}

export interface SendMessageBody {
  content: string
  chatId: string
}
