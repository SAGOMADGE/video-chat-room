# Technical Design Document (TDD): Video Chat Room

| Metadata                | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| **Feature Name**        | `video-chat-room`                                              |
| **Document Version**    | 1.0.0                                                          |
| **Target Architecture** | Client-Server (React + Node.js + Socket.io + WebRTC Full-Mesh) |
| **PRD Reference**       | Video Chat Room PRD v1.0                                       |

---

## 1. Overview / Контекст

**Цель:** Создать лёгкое браузерное приложение для видеозвонков (до 4 человек) с текстовым чатом, не требующее регистрации.

**Технологические рамки:**

- **Frontend:** React, Tailwind CSS, WebRTC API.
- **Backend:** Node.js, Express, Socket.io.
- **Медиа-топология:** WebRTC Full-Mesh (до 4 участников).
- **ICE / NAT:** Публичные STUN-серверы Google (`stun:stun.l.google.com:19302`).
- **Хранилище:** In-Memory (Map в памяти процессов Node.js).

---

## 2. Архитектурная структура (Repository Layout)

```text
/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Компоненты (VideoGrid, Chat, Controls, JoinForm)
│   │   ├── hooks/          # Кастомные хуки (useWebRTC, useSocket)
│   │   ├── services/       # WebRTC peer manager & socket client
│   │   ├── types/          # TypeScript интерфейсы
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── managers/       # RoomManager (учет комнат)
│   │   ├── handlers/       # Socket.io обработчики
│   │   ├── types/          # Backend типизация
│   │   └── index.ts        # Точка входа сервера
│   └── package.json
└── README.md
3. Data Model (In-Memory Structures)
TypeScript
interface Participant {
  id: string; // Socket ID
  name: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface Room {
  id: string;
  participants: Map<string, Participant>;
  messages: ChatMessage[];
}
4. Socket.io Protocol (API Contracts)
Client -> Server Events
room:join — { roomId: string, userName: string }

webrtc:offer — { targetId: string, offer: RTCSessionDescriptionInit }

webrtc:answer — { targetId: string, answer: RTCSessionDescriptionInit }

webrtc:ice-candidate — { targetId: string, candidate: RTCIceCandidateInit }

media:toggle — { isAudioActive: boolean, isVideoActive: boolean }

chat:message — { text: string }

room:leave — {}

Server -> Client Events
room:joined — { roomId: string, participants: Participant[], messages: ChatMessage[] }

room:full — { message: string }

room:user-joined — { participant: Participant, systemMessage: ChatMessage }

room:user-left — { userId: string, systemMessage: ChatMessage }

webrtc:offer — { senderId: string, offer: RTCSessionDescriptionInit }

webrtc:answer — { senderId: string, answer: RTCSessionDescriptionInit }

webrtc:ice-candidate — { senderId: string, candidate: RTCIceCandidateInit }

media:updated — { userId: string, isAudioActive: boolean, isVideoActive: boolean }

chat:message — { message: ChatMessage }
```
