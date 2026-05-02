import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return undefined;

    const base =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
        ? "http://127.0.0.1:5000"
        : window.location.origin);

    const client = io(base, {
      auth: { token }
    });

    client.on("call_assigned", (payload) => {
      toast.success(`Call assigned to ${payload.engineer} (${payload.cameraId || "camera"})`);
    });
    client.on("call_completed", (payload) => {
      toast.success(`Call completed for ${payload.cameraId || "camera"}`);
    });
    client.on("approval_requested", (payload) => {
      if (user?.role === "client" || user?.role === "admin") {
        toast((payload.requestNote ? `Approval needed: ${payload.requestNote}` : "Approval request received"), {
          icon: "📝"
        });
      }
    });
    client.on("approval_decision", (payload) => {
      if (user?.role === "engineer" || user?.role === "admin") {
        toast(
          `Customer ${payload.decision === "approved" ? "approved" : "rejected"} call ${payload.cameraId || payload.callId}`
        );
      }
    });

    setSocket(client);

    return () => {
      client.disconnect();
      setSocket(null);
    };
  }, [token, user?.role]);

  const value = useMemo(() => ({ socket }), [socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
