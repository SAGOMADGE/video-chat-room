import React, { useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { JoinForm } from "./components/JoinForm";
import { VideoCard } from "./components/VideoCard";
import { ChatPanel } from "./components/ChatPanel";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  MessageSquare,
} from "lucide-react";

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);

  const {
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
    currentSocketId,
  } = useWebRTC(roomId, userName);

  const handleJoin = (inputRoomId: string, inputUserName: string) => {
    console.log("2. [App] Получены данные из формы:", {
      inputRoomId,
      inputUserName,
    });
    setRoomId(inputRoomId);
    setUserName(inputUserName);
    joinRoom(inputRoomId, inputUserName);
  };

  if (!isJoined) {
    return <JoinForm onJoin={handleJoin} error={error} />;
  }

  const remoteParticipants = participants.filter(
    (p) => p.id !== currentSocketId,
  );

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden p-4 gap-4">
      {/* Шапка */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h2 className="text-sm font-bold text-white">Комната: {roomId}</h2>
          <p className="text-[11px] text-slate-400">
            Участников: {participants.length} / 4
          </p>
        </div>
        <button
          onClick={() => setIsChatOpen((prev) => !prev)}
          className={`p-2 rounded-xl border transition-colors ${
            isChatOpen
              ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </header>

      {/* Основной контент */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
          <VideoCard
            stream={localStream}
            name={userName}
            isAudioActive={isAudioActive}
            isVideoActive={isVideoActive}
            isLocal
          />

          {remoteParticipants.map((p) => (
            <VideoCard
              key={p.id}
              stream={p.stream}
              name={p.name}
              isAudioActive={p.isAudioActive}
              isVideoActive={p.isVideoActive}
            />
          ))}
        </div>

        {isChatOpen && (
          <div className="w-80 h-full">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              currentUserId={currentSocketId}
            />
          </div>
        )}
      </div>

      {/* Панель управления */}
      <footer className="flex items-center justify-center gap-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={toggleAudio}
          className={`p-3.5 rounded-2xl transition-all ${
            isAudioActive
              ? "bg-slate-800 hover:bg-slate-700 text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
          }`}
        >
          {isAudioActive ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-2xl transition-all ${
            isVideoActive
              ? "bg-slate-800 hover:bg-slate-700 text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
          }`}
        >
          {isVideoActive ? (
            <VideoIcon className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={leaveRoom}
          className="p-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-lg shadow-rose-600/25"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
