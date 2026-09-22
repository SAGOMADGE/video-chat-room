export interface Participant {
  id: string;
  name: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}
