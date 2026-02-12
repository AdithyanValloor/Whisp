export const showNotification = (msg: any) => {
  if (Notification.permission === "granted") {
    new Notification(msg.sender?.displayName || "New Message", {
      body: msg.content,
      icon: msg.sender?.profilePicture?.url || "/default-avatar.png",
    });
  }
};
