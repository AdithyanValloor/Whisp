import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:9000"); // your server URL

function Socket() {
    
    const [message, setMessage] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("receive-message", (msg) => {
      console.log("Received:", msg);
    });
  }, []);

  const sendMessage = () => {
    socket.emit("send-message", {
      chatId: "dummy-chat-id",
      content: message,
    });
  };


  return (
    <div>
      <h1>Socket Test</h1>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type something"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}

export default Socket



