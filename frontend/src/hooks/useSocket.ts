import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// TODO (production): authenticate WebSocket connections using JWT handshake
const SOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

export type SocketEventName =
  | 'referral:status-changed'
  | 'referral:note-added'
  | 'referral:document-uploaded';

export interface StatusChangedPayload {
  referralId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
}

export interface NoteAddedPayload {
  referralId: string;
  note: any;
}

export interface DocumentUploadedPayload {
  referralId: string;
  document: any;
}

export interface SocketEvent {
  name: SocketEventName;
  data: StatusChangedPayload | NoteAddedPayload | DocumentUploadedPayload;
  receivedAt: number;
}

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    sharedSocket.on('connect_error', (err) => {
      // Backend may be down — keep retrying via socket.io's built-in reconnection.
      // eslint-disable-next-line no-console
      console.warn('[socket] connect_error:', err.message);
    });
  }
  return sharedSocket;
}

export function useSocket(): SocketEvent | null {
  const [event, setEvent] = useState<SocketEvent | null>(null);
  const handlersRef = useRef<Array<[SocketEventName, (data: any) => void]>>([]);

  useEffect(() => {
    const socket = getSharedSocket();
    refCount += 1;

    const names: SocketEventName[] = [
      'referral:status-changed',
      'referral:note-added',
      'referral:document-uploaded',
    ];

    handlersRef.current = names.map((name) => {
      const handler = (data: any) => {
        setEvent({ name, data, receivedAt: Date.now() });
      };
      socket.on(name, handler);
      return [name, handler];
    });

    return () => {
      for (const [name, handler] of handlersRef.current) {
        socket.off(name, handler);
      }
      handlersRef.current = [];
      refCount -= 1;
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, []);

  return event;
}
