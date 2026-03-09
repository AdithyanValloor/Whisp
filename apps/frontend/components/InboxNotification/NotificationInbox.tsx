'use client';

import { useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

import NotificationCard from './NotificationCard';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/redux/features/notificationSlice';

import { InboxNotification } from '@/redux/features/notificationSlice';
import { useRouter } from 'next/navigation';
import { setJumpTo } from '@/redux/features/messageSlice';

export default function NotificationInbox() {
  const dispatch = useAppDispatch();

  const { notifications, unreadCount, loading } = useAppSelector(
    (state) => state.notifications
  );

  const router = useRouter()

  /* ---------------- Fetch notifications ---------------- */

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  /* ---------------- Actions ---------------- */

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      dispatch(markAllNotificationsRead());
    }
  };

const handleNotificationClick = (notification: InboxNotification) => {
  if (!notification.read) {
    dispatch(markNotificationRead(notification._id));
  }

  if(notification.group?._id){
    router.push(`/chat/${notification.group._id}`);
  }

  if (notification.chat?._id) {
    if (notification.message?._id) {
      dispatch(
        setJumpTo({
          chatId: notification.chat._id,
          messageId: notification.message._id,
        })
      );
    }

    router.push(`/chat/${notification.chat._id}`);
  }
};

  /* ---------------- Derived data ---------------- */

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  /* ---------------- Render ---------------- */

  return (
    <div className="h-full w-full flex flex-col shadow">
      {/* Header */}

      <div className="px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-base-content/70" />

            <h1 className="text-xl font-semibold text-base-content">
              Inbox
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-sm text-center opacity-50">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-40 select-none">
            <Bell size={32} strokeWidth={1.5} />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <>
            {/* Unread section */}

            {unreadNotifications.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                  New
                </p>

                <div className="px-2 flex flex-col gap-1">
                  {unreadNotifications.map((notification) => (
                    <NotificationCard
                      key={notification._id}
                      notification={notification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Read section */}

            {readNotifications.length > 0 && (
              <div>
                <p className="px-4 pt-4 pb-1 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
                  Earlier
                </p>

                <div className="px-2 flex flex-col gap-1 pb-3">
                  {readNotifications.map((notification) => (
                    <NotificationCard
                      key={notification._id}
                      notification={notification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}