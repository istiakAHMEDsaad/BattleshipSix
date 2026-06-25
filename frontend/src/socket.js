import { io } from "socket.io-client";

// We set autoConnect to false so we only connect when the user actually needs to
// (e.g., when they click "Create Room" or "Join Room")
const socket = io(import.meta.env.VITE_API, {
  autoConnect: false,
});

export default socket;
