export interface FriendUserPayload {
  _id: string;
  username: string;
  displayName?: string;
  profilePicture?: {
    url?: string | null;
  };
}

export interface FriendRequestSocketPayload {
  _id: string;
  from: FriendUserPayload;
  to: FriendUserPayload;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}