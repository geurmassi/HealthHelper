import { Module } from '@nestjs/common';
import { ReferralGateway } from './referral.gateway';

@Module({
  providers: [ReferralGateway],
  exports: [ReferralGateway],
})
export class GatewayModule {}
