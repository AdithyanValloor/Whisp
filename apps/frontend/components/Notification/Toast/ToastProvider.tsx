"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Toast } from "./types";
import ToastContainer from "./ToastContainer";
import { registerToastListener } from "@/utils/toastEmitter";
import NotificationContainer from "./NotificationContainer";
import { useRouter } from "next/navigation";

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [systemToasts, setSystemToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Toast[]>([]);

  const router = useRouter();

  useEffect(() => {
    registerToastListener((event) => {
      showToast({
        ...event,
        onAction:
          event.type === "message"
            ? () => router.push(`/chat/${event.chatId}`)
            : event.onAction,
      });
    });
  }, [router]);

  const showToast = (toast: Omit<Toast, "id">) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const newToast = { ...toast, id };

    const isNotification =
      toast.type === "message" ||
      toast.type === "friend_request" ||
      toast.type === "friend_accept" ||
      toast.type === "call";

    if (isNotification && toast.chatId) {
      setNotifications((prev) => {
        const existingIndex = prev.findIndex((t) => t.chatId === toast.chatId);

        if (existingIndex !== -1) {
          const updated = [...prev];
          const existing = updated[existingIndex];

          updated[existingIndex] = {
            ...existing,
            description: toast.description,
            messageCount: (existing.messageCount ?? 1) + 1,
          };

          return updated;
        }

        return [
          ...prev,
          {
            ...toast,
            id,
            messageCount: 1,
          },
        ];
      });

      if (!toast.persistent) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration || 4000);
      }

      return;
    } else {
      setSystemToasts((prev) => [...prev, newToast]);
    }
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 4000);
    }
  };

  const removeToast = (id: string) => {
    setSystemToasts((prev) => prev.filter((t) => t.id !== id));
    setNotifications((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* System Error Toasts */}
      <ToastContainer toasts={systemToasts} removeToast={removeToast} />

      {/* Message / Friend Notifications */}
      <NotificationContainer
        notifications={notifications}
        removeToast={removeToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
