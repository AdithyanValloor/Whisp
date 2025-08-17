import { UserModel } from "../models/user.model";


export const getProfileByUserId = async (userId: string) => {

  if (!userId) throw new Error("Unauthorized: No user info found")

  const profile = await UserModel.findById(userId).select("-password")
  if (!profile) throw new Error("User not found")

  return profile
}
