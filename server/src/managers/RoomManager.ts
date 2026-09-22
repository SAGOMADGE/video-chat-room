import { Room, Participant, ChatMessage } from "../types/index.js";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly MAX_PARTICIPANTS = 4;

  // Получить комнату или создать новую
  public getOrCreateRoom(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: new Map(),
        messages: [],
      });
    }
    return this.rooms.get(roomId)!;
  }

  // Проверка: заполнена ли комната
  public isRoomFull(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.participants.size >= this.MAX_PARTICIPANTS;
  }

  // Добавление участника
  public addParticipant(
    roomId: string,
    participant: Participant,
  ): { success: boolean; error?: string } {
    if (this.isRoomFull(roomId)) {
      return { success: false, error: "room:full" };
    }

    const room = this.getOrCreateRoom(roomId);
    room.participants.set(participant.id, participant);
    return { success: true };
  }

  // Удаление участника
  public removeParticipant(
    socketId: string,
  ): { roomId?: string; participant?: Participant } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) {
        const participant = room.participants.get(socketId);
        room.participants.delete(socketId);

        // Если комната пустая — удаляем ее из памяти (NFR-2)
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
        }

        return { roomId, participant };
      }
    }
    return null;
  }

  // Обновление состояния медиа (микрофон / камера)
  public updateMediaState(
    socketId: string,
    isAudioActive: boolean,
    isVideoActive: boolean,
  ): { roomId?: string } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) {
        const participant = room.participants.get(socketId)!;
        participant.isAudioActive = isAudioActive;
        participant.isVideoActive = isVideoActive;
        return { roomId };
      }
    }
    return null;
  }

  // Сохранение сообщения чата
  public addMessage(roomId: string, message: ChatMessage): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.messages.push(message);
    }
  }

  // Получение всех участников комнаты в виде массива
  public getParticipants(roomId: string): Participant[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.participants.values());
  }

  // Получение сообщений комнаты
  public getMessages(roomId: string): ChatMessage[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.messages;
  }
}
