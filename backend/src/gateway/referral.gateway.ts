import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// TODO (production): authenticate WebSocket connections using JWT handshake
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://healthhelper.local'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ReferralGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ReferralGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  emitReferralUpdate(event: string, data: any) {
    console.log(`[WebSocket] Emitting: ${event}`, data);
    this.server.emit(event, data);
  }
}
