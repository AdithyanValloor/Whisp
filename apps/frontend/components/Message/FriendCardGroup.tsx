import Image from 'next/image';
import React from 'react'

interface memberType {
    member: {
        _id: string;
        username: string;
        displayName:string;
        profilePicture?: {
            url: string | null;
        } | undefined;
        status?: string | null | undefined;
        role?: "admin" | "member" | undefined;
    }
}

function FriendCardGroup({member}:memberType) {
  return (
    <div className="flex items-center justify-between rounded p-1 w-full">
        <div className="flex items-center gap-2">
            <div className="avatar">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                        src={member.profilePicture?.url || "/default-pfp.png"}
                        alt="profile picture"
                        width={32}
                        height={32}
                        className="object-cover"
                    />
                </div>
            </div>
            <span>{ member.displayName || member.username}</span>
        </div>
        <span className="badge badge-ghost text-xs">
            {member.role === "admin" ? "⭐ Admin" : "Member"}
        </span>
    </div>
  )
}

export default FriendCardGroup
