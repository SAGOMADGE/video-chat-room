import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface Participant {
  id: string;
  name: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
}

// Хранилище комнат и сообщений
const rooms = new Map<string, Map<string, Participant>>();
const roomMessages = new Map<string, any[]>();

io.on("connection", (socket) => {
  let currentRoomId: string | null = null;

  // Вход в комнату
  socket.on("room:join", ({ roomId, userName }) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
      roomMessages.set(roomId, []);
    }

    const room = rooms.get(roomId)!;

    if (room.size >= 4) {
      socket.emit("room:full", {
        message: "Комната заполнена (максимум 4 человека)",
      });
      return;
    }

    currentRoomId = roomId;
    socket.join(roomId);

    const newParticipant: Participant = {
      id: socket.id,
      name: userName,
      isAudioActive: true,
      isVideoActive: true,
    };

    room.set(socket.id, newParticipant);

    // Отправляем подключившемуся текущий список участников и чат
    socket.emit("room:joined", {
      participants: Array.from(room.values()),
      messages: roomMessages.get(roomId) || [],
    });

    const systemMessage = {
      id: Date.now().toString(),
      senderId: "system",
      senderName: "Система",
      text: `Пользователь ${userName} присоединился`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    roomMessages.get(roomId)?.push(systemMessage);

    // Оповещаем остальные вкладки
    socket.to(roomId).emit("room:user-joined", {
      participant: newParticipant,
      systemMessage,
    });
  });

  // Обработка сообщений в чате
  socket.on("chat:message", ({ roomId, text }) => {
    if (!roomId || !rooms.has(roomId) || !text.trim()) return;

    const room = rooms.get(roomId);
    const sender = room?.get(socket.id);

    if (!sender) return;

    const newMessage = {
      id: Date.now().toString(),
      senderId: socket.id,
      senderName: sender.name,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    roomMessages.get(roomId)?.push(newMessage);

    // Рассылаем всем в комнате (включая отправителя)
    io.to(roomId).emit("chat:message", newMessage);
  });

  // Выход из комнаты
  socket.on("room:leave", () => {
    handleUserDisconnect(socket, currentRoomId);
    currentRoomId = null;
  });

  socket.on("disconnect", () => {
    handleUserDisconnect(socket, currentRoomId);
  });
});

function handleUserDisconnect(socket: any, roomId: string | null) {
  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId)!;
  const participant = room.get(socket.id);

  if (participant) {
    room.delete(socket.id);
    socket.leave(roomId);

    const systemMessage = {
      id: Date.now().toString(),
      senderId: "system",
      senderName: "Система",
      text: `Пользователь ${participant.name} вышел`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    roomMessages.get(roomId)?.push(systemMessage);

    io.to(roomId).emit("room:user-left", {
      userId: socket.id,
      systemMessage,
    });

    if (room.size === 0) {
      rooms.delete(roomId);
      roomMessages.delete(roomId);
    }
  }
}

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
