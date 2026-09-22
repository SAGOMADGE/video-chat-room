export interface Participant {
  id: string; // Socket ID
  name: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface Room {
  id: string;
  participants: Map<string, Participant>;
  messages: ChatMessage[];
}
