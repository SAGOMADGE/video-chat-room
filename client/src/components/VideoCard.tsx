import React, { useEffect, useRef } from "react";
import { Mic, MicOff, User } from "lucide-react";

interface VideoCardProps {
  stream: MediaStream | null;
  name: string;
  isAudioActive?: boolean;
  isVideoActive?: boolean;
  isLocal?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  stream,
  name,
  isAudioActive = true,
  isVideoActive = true,
  isLocal = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (stream && isVideoActive) {
      videoElement.srcObject = stream;
    } else {
      videoElement.srcObject = null;
    }
  }, [stream, isVideoActive]);

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-[200px]">
      {isVideoActive && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 border border-slate-700">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <span className="text-xs font-medium text-slate-400">
            Камера выключена
          </span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 bg-slate-950/70 backdrop-blur-md rounded-xl border border-white/10">
        <span className="text-xs font-medium text-slate-200 truncate max-w-[80%]">
          {name} {isLocal && "(Вы)"}
        </span>
        <div className="flex items-center gap-1">
          {isAudioActive ? (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <MicOff className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>
      </div>
    </div>
  );
};
