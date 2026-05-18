import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralGateway } from '../../gateway/referral.gateway';
import { User } from '../../users/user.entity';
import { Referral } from '../referral.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { ReferralNote } from './referral-note.entity';

@Injectable()
export class ReferralNotesService {
  constructor(
    @InjectRepository(ReferralNote)
    private readonly notesRepository: Repository<ReferralNote>,
    @InjectRepository(Referral)
    private readonly referralsRepository: Repository<Referral>,
    private readonly referralGateway: ReferralGateway,
  ) {}

  async create(
    referralId: string,
    dto: CreateNoteDto,
    user: User,
  ): Promise<ReferralNote> {
    const referral = await this.referralsRepository.findOne({
      where: { id: referralId },
    });
    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }
    const note = this.notesRepository.create({
      referral,
      user,
      content: dto.content,
    });
    const saved = await this.notesRepository.save(note);

    this.referralGateway.emitReferralUpdate('referral:note-added', {
      referralId,
      note: saved,
    });

    return saved;
  }

  async findAllForReferral(referralId: string): Promise<ReferralNote[]> {
    const referral = await this.referralsRepository.findOne({
      where: { id: referralId },
    });
    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }
    return this.notesRepository.find({
      where: { referral: { id: referralId } },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
}
