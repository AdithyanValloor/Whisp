"use client";

import { ArrowLeft } from "lucide-react";

interface SubPageProps {
  onBack: () => void;
  title: string;
  children?: React.ReactNode;
}

export function SubPage({ onBack, title, children }: SubPageProps) {
  return (
    <div className="w-full h-full relative overflow-auto">
      {/* Header with back */}
      <div className="flex items-center gap-2 p-3 border-b border-base-300">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-base-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {/* Content */}
      <div className="p-4">{children || <p className="opacity-70">Coming soon…</p>}</div>
    </div>
  );
}
