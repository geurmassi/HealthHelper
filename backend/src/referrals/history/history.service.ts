import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralStepHistory } from './referral-step-history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(ReferralStepHistory)
    private readonly historyRepo: Repository<ReferralStepHistory>,
  ) {}

  async getHistoryInfo(referralId: string) {
    return this.historyRepo.find({
      where: { referral: { id: referralId } },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });
  }
}
