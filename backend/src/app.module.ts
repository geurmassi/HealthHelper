import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLog } from './audit/audit-log.entity';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Patient } from './patients/patient.entity';
import { PatientsModule } from './patients/patients.module';
import { ReferralDocument } from './referrals/documents/referral-document.entity';
import { ReferralStepHistory } from './referrals/history/referral-step-history.entity';
import { ReferralNote } from './referrals/notes/referral-note.entity';
import { Referral } from './referrals/referral.entity';
import { ReferralsModule } from './referrals/referrals.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';


// Root module — wires every feature, the DB, the BullMQ queue, and global auth/role guards.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'referrals_user',
      password: process.env.DB_PASS || 'referrals_pass',
      database: process.env.DB_NAME || 'referrals_db',
      autoLoadEntities: true,
**


    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    GatewayModule,
    ReferralsModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
