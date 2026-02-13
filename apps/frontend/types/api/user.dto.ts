export interface BackendUserDTO {
  _id: string;
  username: string;
  email: string;

  displayName: string;

  profilePicture: {
    url: string | null;
    public_id: string | null;
  };

  coverPicture: {
    url: string | null;
    public_id: string | null;
  };

  bio: string | null;
  pronouns: string | null;
  status: string | null;

  friendList: string[];

  isActive: boolean;
  isBanned: boolean;

  banType: "temporary" | "permanent" | null;
  banExpiry: string | null;

  createdAt: string;
  updatedAt: string;
}
