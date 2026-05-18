import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatewayModule } from '../gateway/gateway.module';
import { Referral } from '../referrals/referral.entity';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { REFERRAL_NOTIFICATIONS_QUEUE } from './constants';

// Wires the BullMQ queue, producer, and consumer for all referral background notifications.
@Module({
  imports: [
    BullModule.registerQueue({ name: REFERRAL_NOTIFICATIONS_QUEUE }),
    TypeOrmModule.forFeature([Referral]),
    GatewayModule,
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
