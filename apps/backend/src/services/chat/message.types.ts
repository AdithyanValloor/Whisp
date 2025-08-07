export type MessagePayload = {
    receiverId: string, 
    message: string
}

export interface SendMessageBody {
  receiverId: string;
  content: string;
  chatId: string
}
