import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Participant, ChatMessage } from "../types";

const SERVER_URL = "http://localhost:3001";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(initialRoomId: string, initialUserName: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(true);
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);

  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentRoomIdRef = useRef<string>(initialRoomId);

  // 1. Инициализация локального медиапотока (камера + микрофон)
  const initLocalStream = useCallback(async () => {
    try {
      console.log("4. [useWebRTC] Запрашиваем доступ к камере/микрофону...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("5. [useWebRTC] ✅ Успешно получен медиапоток:", stream);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("❌ [useWebRTC] Ошибка доступа к медиаустройствам:", err);
      setError("Не удалось получить доступ к камере или микрофону");
      return null;
    }
  }, []);

  // Создание RTCPeerConnection
  const createPeerConnection = useCallback(
    (targetId: string, stream: MediaStream) => {
      if (peerConnections.current.has(targetId)) {
        peerConnections.current.get(targetId)?.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("webrtc:ice-candidate", {
            targetId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, stream: remoteStream } : p,
          ),
        );
      };

      peerConnections.current.set(targetId, pc);
      return pc;
    },
    [],
  );

  // 2. Вход в комнату (принимает данные напрямую)
  const joinRoom = useCallback(
    async (overrideRoomId?: string, overrideUserName?: string) => {
      const roomId = overrideRoomId || initialRoomId;
      const userName = overrideUserName || initialUserName;
      currentRoomIdRef.current = roomId;

      console.log("3. [useWebRTC] joinRoom вызван со значениями:", {
        roomId,
        userName,
      });

      if (!roomId || !userName) {
        console.warn(
          "⚠️ [useWebRTC] joinRoom отменен: roomId или userName пустые!",
        );
        return;
      }

      const stream = await initLocalStream();
      if (!stream) {
        console.error(
          "❌ [useWebRTC] Не удалось получить медиапоток (stream === null)",
        );
        return;
      }

      console.log("6. [useWebRTC] Подключаемся к Socket.io серверу...");
      const socket = io(SERVER_URL);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log(
          "7. [useWebRTC] ✅ Успешное сокет-соединение! Socket ID:",
          socket.id,
        );
        console.log("8. [useWebRTC] Отправляем событие room:join на сервер...");
        socket.emit("room:join", { roomId, userName });
      });

      socket.on("connect_error", (err) => {
        console.error(
          "❌ [useWebRTC] Ошибка подключения к сокет-серверу:",
          err,
        );
        setError("Не удалось подключиться к серверу");
      });

      socket.on("room:full", ({ message }: { message: string }) => {
        console.warn("⚠️ [useWebRTC] Комната переполнена:", message);
        setError(message);
        socket.disconnect();
      });

      socket.on(
        "room:joined",
        ({ participants: roomParticipants, messages: roomMessages }) => {
          console.log("9. [useWebRTC] 🎉 Сервер вернул room:joined!", {
            roomParticipants,
            roomMessages,
          });
          setSocketId(socket.id);
          setParticipants(roomParticipants);
          setMessages(roomMessages);
          setIsJoined(true);
        },
      );

      socket.on("room:user-joined", async ({ participant, systemMessage }) => {
        console.log("👤 [useWebRTC] Новый пользователь вошел:", participant);
        setParticipants((prev) => [...prev, participant]);
        setMessages((prev) => [...prev, systemMessage]);

        if (localStreamRef.current) {
          const pc = createPeerConnection(
            participant.id,
            localStreamRef.current,
          );
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("webrtc:offer", { targetId: participant.id, offer });
        }
      });

      socket.on("webrtc:offer", async ({ senderId, offer }) => {
        if (!localStreamRef.current) return;

        const pc = createPeerConnection(senderId, localStreamRef.current);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", { targetId: senderId, answer });
      });

      socket.on("webrtc:answer", async ({ senderId, answer }) => {
        const pc = peerConnections.current.get(senderId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on("webrtc:ice-candidate", async ({ senderId, candidate }) => {
        const pc = peerConnections.current.get(senderId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on("media:updated", ({ userId, isAudioActive, isVideoActive }) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === userId ? { ...p, isAudioActive, isVideoActive } : p,
          ),
        );
      });

      socket.on("chat:message", (message: ChatMessage) => {
        console.log("📥 [useWebRTC] Получено новое сообщение:", message);
        setMessages((prev) => [...prev, message]);
      });

      socket.on("room:user-left", ({ userId, systemMessage }) => {
        setMessages((prev) => [...prev, systemMessage]);
        setParticipants((prev) => prev.filter((p) => p.id !== userId));

        if (peerConnections.current.has(userId)) {
          peerConnections.current.get(userId)?.close();
          peerConnections.current.delete(userId);
        }
      });
    },
    [initialRoomId, initialUserName, initLocalStream, createPeerConnection],
  );

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioActive(audioTrack.enabled);
        socketRef.current?.emit("media:toggle", {
          isAudioActive: audioTrack.enabled,
          isVideoActive,
        });
      }
    }
  }, [isVideoActive]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoActive(videoTrack.enabled);
        socketRef.current?.emit("media:toggle", {
          isAudioActive,
          isVideoActive: videoTrack.enabled,
        });
      }
    }
  }, [isAudioActive]);

  const sendMessage = useCallback((text: string) => {
    if (text.trim() && socketRef.current) {
      console.log("📤 [useWebRTC] Отправляем сообщение:", text);
      socketRef.current.emit("chat:message", {
        roomId: currentRoomIdRef.current,
        text: text.trim(),
      });
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    if (socketRef.current) {
      socketRef.current.emit("room:leave");
      socketRef.current.disconnect();
    }

    setIsJoined(false);
    setSocketId(undefined);
    setParticipants([]);
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    participants,
    messages,
    localStream,
    isAudioActive,
    isVideoActive,
    isJoined,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    sendMessage,
    currentSocketId: socketId,
  };
}
