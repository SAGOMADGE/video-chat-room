import { Server, Socket } from "socket.io";
import { RoomManager } from "../managers/RoomManager.js";
import { ChatMessage, Participant } from "../types/index.js";

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // 1. Вход в комнату
    socket.on(
      "room:join",
      ({ roomId, userName }: { roomId: string; userName: string }) => {
        // Валидация имени (FR-6)
        const sanitizedName = userName.trim().slice(0, 30) || "Аноним";

        // Проверка на лимит 4 человек (FR-2)
        if (roomManager.isRoomFull(roomId)) {
          socket.emit("room:full", {
            message: "Комната заполнена (максимум 4 участника)",
          });
          return;
        }

        const participant: Participant = {
          id: socket.id,
          name: sanitizedName,
          isAudioActive: true,
          isVideoActive: true,
        };

        const result = roomManager.addParticipant(roomId, participant);

        if (!result.success) {
          socket.emit("room:full", {
            message: "Не удалось присоединиться к комнате",
          });
          return;
        }

        // Подключаем сокет к комнате Socket.io
        socket.join(roomId);

        // Системное сообщение о входе
        const systemMessage: ChatMessage = {
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 5),
          senderId: "system",
          senderName: "Система",
          text: `Пользователь ${sanitizedName} присоединился`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isSystem: true,
        };

        roomManager.addMessage(roomId, systemMessage);

        // Отправляем подключившемуся текущих участников и историю сообщений
        socket.emit("room:joined", {
          roomId,
          participants: roomManager.getParticipants(roomId),
          messages: roomManager.getMessages(roomId),
        });

        // Оповещаем остальных в комнате о новом участнике
        socket.to(roomId).emit("room:user-joined", {
          participant,
          systemMessage,
        });
      },
    );

    // 2. WebRTC Сигналинг (Offer / Answer / ICE Candidates)
    socket.on(
      "webrtc:offer",
      ({
        targetId,
        offer,
      }: {
        targetId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        io.to(targetId).emit("webrtc:offer", {
          senderId: socket.id,
          offer,
        });
      },
    );

    socket.on(
      "webrtc:answer",
      ({
        targetId,
        answer,
      }: {
        targetId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        io.to(targetId).emit("webrtc:answer", {
          senderId: socket.id,
          answer,
        });
      },
    );

    socket.on(
      "webrtc:ice-candidate",
      ({
        targetId,
        candidate,
      }: {
        targetId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        io.to(targetId).emit("webrtc:ice-candidate", {
          senderId: socket.id,
          candidate,
        });
      },
    );

    // 3. Изменение состояния медиа (микрофон / камера)
    socket.on(
      "media:toggle",
      ({
        isAudioActive,
        isVideoActive,
      }: {
        isAudioActive: boolean;
        isVideoActive: boolean;
      }) => {
        const result = roomManager.updateMediaState(
          socket.id,
          isAudioActive,
          isVideoActive,
        );
        if (result?.roomId) {
          io.to(result.roomId).emit("media:updated", {
            userId: socket.id,
            isAudioActive,
            isVideoActive,
          });
        }
      },
    );

    // 4. Текстовый чат
    socket.on("chat:message", ({ text }: { text: string }) => {
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      const roomId = rooms[0];

      if (!roomId) return;

      const participants = roomManager.getParticipants(roomId);
      const sender = participants.find((p) => p.id === socket.id);

      if (!sender) return;

      const message: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        senderId: socket.id,
        senderName: sender.name,
        text: text.trim().slice(0, 500), // ограничение длины сообщения
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      roomManager.addMessage(roomId, message);
      io.to(roomId).emit("chat:message", { message });
    });

    // 5. Выход и отключение
    const handleLeave = () => {
      const leftData = roomManager.removeParticipant(socket.id);
      if (leftData && leftData.roomId && leftData.participant) {
        const { roomId, participant } = leftData;

        const systemMessage: ChatMessage = {
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 5),
          senderId: "system",
          senderName: "Система",
          text: `Пользователь ${participant.name} покинул комнату`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isSystem: true,
        };

        roomManager.addMessage(roomId, systemMessage);

        io.to(roomId).emit("room:user-left", {
          userId: socket.id,
          systemMessage,
        });
      }
    };

    socket.on("room:leave", handleLeave);
    socket.on("disconnect", handleLeave);
  });
}
