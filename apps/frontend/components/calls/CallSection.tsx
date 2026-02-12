'use client'

import { Search } from "lucide-react";

export default function CallSection() {

    return (
        <div className="h-full w-full p-3 flex flex-col gap-3 shadow">
            
            {/* Title */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Calls</h1>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full h-10 pl-10 pr-3 rounded-full border border-base-300 bg-base
                               focus:outline-none focus:ring-2 focus:ring-[#004030] transition"
                />
            </div>

            {/* Messages Section */}
            <div className="flex-1 overflow-y-auto">
                <div className="rounded-lg shadow-sm h-full">
                   
                </div>
            </div>
        </div>
    )
}
