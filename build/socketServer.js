"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
// Khởi tạo server Socket.IO
const initSocketServer = (server) => {
    const io = new socket_io_1.Server(server);
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
exports.initSocketServer = initSocketServer;
