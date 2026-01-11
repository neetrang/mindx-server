import { Server as SocketIOServer } from "socket.io";
import http from "http";

// Khởi tạo server Socket.IO
export const initSocketServer = (server: http.Server) => {
  const io = new SocketIOServer(server);

  io.on("connection", (socket) => {
    console.log("Một người dùng đã kết nối");

    // Lắng nghe sự kiện 'notification' từ frontend
    socket.on("notification", (data) => {
      // Phát dữ liệu thông báo tới tất cả client đang kết nối (ví dụ: admin dashboard)
      io.emit("newNotification", data);
    });

    socket.on("disconnect", () => {
      console.log("Một người dùng đã ngắt kết nối");
    }); 
  });
};
