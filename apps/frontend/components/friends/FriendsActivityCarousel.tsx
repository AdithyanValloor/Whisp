import { Circle } from "lucide-react";
import Image from "next/image";

export default function ActivityCarousel(){
    
    const friends = [
    { 
        name: "Damu", 
        profilePic:"https://images.filmibeat.com/img/popcorn/movie_posters/dashamoolam-damu-mal-20180814150823-1390.jpg", 
        status:"online" 
    },
    { 
        name: "Ramanan", 
        profilePic:"https://pbs.twimg.com/profile_images/1694306547009208320/p5mobUa8_400x400.jpg", 
        status:"dnd" 
    },
    { 
        name: "Manavalan", 
        profilePic:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScQQhbIilebPmd9COmkehOuqt5-d08HxNiVQ&s", 
        status:"idle" 
    },
    { 
        name: "Appu", 
        profilePic:"https://i.ytimg.com/vi/Ei5bhRp58iM/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBSVu41C7Il9CXGCCKxzilLswiSjQ", 
        status:"online" 
    },
  ];

  const statusColors: Record<string, string> = {
    online: "green",
    dnd: "red",
    idle: "yellow",
  };


    function renderFriend(user: typeof friends[0]) {
    return (
        <div 
        key={user.name}  // 👈 unique key
        className="flex flex-col items-center cursor-pointer"
        >
        <div className="relative">
            <img 
            src={user.profilePic}
            alt={`${user.name} profile picture`} 
            className="rounded-full w-[65px] h-[65px] object-contain bg-black border border-3 border-base-200"
            />
            <Circle 
            size={15} 
            strokeWidth={0} 
            fill={statusColors[user.status] || "gray"} 
            className="absolute bg-base-200 p-[1px] rounded-full bottom-0.5 right-0.5"
            />
        </div>
        <p className="text-[12px]">{user.name}</p>
        </div>
    );
    }


    return(
        <div className="h-full w-full">
            <div className="flex gap-3">
                {friends.map((user) => (
                    renderFriend(user)
                ))}
            </div>
        </div>
    )
}