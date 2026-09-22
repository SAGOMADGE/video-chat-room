import React, { useState } from "react";
import { Video, User, KeyRound } from "lucide-react";

interface JoinFormProps {
  onJoin: (roomId: string, userName: string) => void;
  error?: string | null;
}

export const JoinForm: React.FC<JoinFormProps> = ({ onJoin, error }) => {
  const [roomId, setRoomId] = useState("main-room");
  const [userName, setUserName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 👈 Предотвращаем перезагрузку страницы
    console.log("1. [JoinForm] Клик по кнопкеSubmit", { roomId, userName });

    if (roomId.trim() && userName.trim()) {
      onJoin(roomId.trim(), userName.trim());
    } else {
      console.warn("1. [JoinForm] Поля не заполнены");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-center w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-6 mx-auto">
          <Video className="w-7 h-7 text-indigo-500" />
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">
          P2P Видеочат
        </h1>
        <p className="text-xs text-center text-slate-400 mb-8">
          Подключение до 4 человек напрямую через WebRTC
        </p>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ваше имя
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Иван Иванов"
                className="w-full bg-slate-800 text-slate-100 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ID Комнаты
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="main-room"
                className="w-full bg-slate-800 text-slate-100 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            Войти в комнату
          </button>
        </form>
      </div>
    </div>
  );
};
