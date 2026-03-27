import { UserModel } from "../../services/user/models/user.model.js";
import { Types } from "mongoose";
import { BlockModel } from "../../services/user/models/block.model.js";
import { FriendRequestModel } from "../../services/user/models/friendRequest.model.js";
// import { NotificationModel } from "../../services/notifications/models/notification.model.js";

export const cleanupUserData = async (ids: Types.ObjectId[]) => {
  await Promise.all([
    // Anonymize each user individually to guarantee unique username/email
    ...ids.map((id) =>
      UserModel.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        displayName: "Deleted User",
        username: `deleted_${id}`,
        email: `deleted_${id}@deleted.invalid`,
        password: "",
        bio: null,
        pronouns: null,
        status: null,
        profilePicture: { url: null, public_id: null },
        coverPicture: { url: null, public_id: null },
        friendList: [],
        scheduledDeletionAt: null,
      })
    ),

    // Remove block records — no longer meaningful
    BlockModel.deleteMany({
      $or: [{ blocker: { $in: ids } }, { blocked: { $in: ids } }],
    }),

    // Remove pending friend requests
    FriendRequestModel.deleteMany({
      $or: [{ from: { $in: ids } }, { to: { $in: ids } }],
    }),

    // Remove from other users' friend lists
    UserModel.updateMany(
      { friendList: { $in: ids } },
      { $pull: { friendList: { $in: ids } } },
    ),
  ]);
};