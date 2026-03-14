import { UserModel } from "../models/user.model.js"

export const areFriends = async (
  userA: string,
  userB: string
): Promise<boolean> => {

  const user = await UserModel.findOne({
    _id: userA,
    friendList: userB
  })

  return !!user
}