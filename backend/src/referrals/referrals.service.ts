import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ReferralGateway } from '../gateway/referral.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralStepHistory } from './history/referral-step-history.entity';
import {
  AuthorizationStatus,
  Referral,
  ReferralPriority,
  ReferralStatus,
  Specialty,
} from './referral.entity';
import {
  ReferralMachineEvent,
  ReferralStatusValue,
} from './workflow/referral.machine';
import { TransitionDto, WorkflowEvent } from './workflow/dto/transition.dto';
import { PersistedSnapshot, WorkflowService } from './workflow/workflow.service';

export interface ReferralFilters {
  status?: ReferralStatus;
  priority?: ReferralPriority;
  specialty?: Specialty;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface TransitionResponse {
  referral: Referral;
  availableTransitions: string[];
}

export interface TransitionsInfoResponse {
  currentStatus: ReferralStatusValue;
  currentSubstep: string;
  availableTransitions: string[];
  missingFieldsForNextStep: string[];
  completedSubsteps: string[];
}

export interface DashboardStats {
  summary: {
    totalReferrals: number;
    averageCompletionDays: number;
    completionRate: number;
    pendingAuthorizations: number;
  };
  byStatus: { status: string; count: number }[];
  bySpecialty: { specialty: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  authorizationBreakdown: { status: string; count: number }[];
  timeToScheduleTrend: { month: string; averageDays: number }[];
}

const ALLOWED_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'priority',
  'status',
  'specialty',
]);

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralsRepository: Repository<Referral>,
    @InjectRepository(ReferralStepHistory)
    private readonly stepHistoryRepository: Repository<ReferralStepHistory>,
    private readonly workflowService: WorkflowService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly referralGateway: ReferralGateway,
  ) {}

  async create(dto: CreateReferralDto, currentUser: User): Promise<Referral> {
    const referral = this.referralsRepository.create({
      patient: { id: dto.patientId } as any,
      referringProvider: { id: currentUser.id } as any,
      referralType: dto.referralType,
      specialty: dto.specialty,
      priority: dto.priority ?? ReferralPriority.ROUTINE,
      diagnosisCode: dto.diagnosisCode ?? null,
      clinicalReason: dto.clinicalReason ?? null,
      requestedProcedure: dto.requestedProcedure ?? null,
      status: ReferralStatus.INTAKE,
      currentSubstep: '1a',
    });
    const saved = await this.referralsRepository.save(referral);
    const snapshot = this.workflowService.initializeMachine(saved.id);
    saved.xstateSnapshot = snapshot as unknown as Record<string, unknown>;
    return this.referralsRepository.save(saved);
  }

  async findAll(filters: ReferralFilters): Promise<{
    data: Referral[];
    total: number;
    page: number;
    limit: number;
  }>
  {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const sortBy = ALLOWED_SORT_FIELDS.has(filters.sortBy ?? '')
      ? (filters.sortBy as string)
      : 'createdAt';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.referralsRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.patient', 'patient')
      .leftJoinAndSelect('referral.referringProvider', 'referringProvider')
      .leftJoinAndSelect('referral.specialist', 'specialist');

    if (filters.status) {
      qb.andWhere('referral.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('referral.priority = :priority', {
        priority: filters.priority,
      });
    }
    if (filters.specialty) {
      qb.andWhere('referral.specialty = :specialty', {
        specialty: filters.specialty,
      });
    }

    if (filters.fromDate) {
      qb.andWhere('referral.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters.toDate) {
      qb.andWhere('referral.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    const search = filters.search?.trim();
    if (search) {
      const term = `%${search}%`;
      // Brackets group the OR-conditions so the search clause stays AND-combined with the filters above.
      qb.andWhere(
        new Brackets((b) => {
          b.where('patient.firstName ILIKE :term', { term })
            .orWhere('patient.lastName ILIKE :term', { term })
            .orWhere('referral.diagnosisCode ILIKE :term', { term });
        }),
      );
    }

    qb.orderBy(`referral.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Referral> {
    const referral = await this.referralsRepository.findOne({
      where: { id },
      relations: ['patient', 'referringProvider', 'specialist'],
    });
    if (!referral) {
      throw new NotFoundException(`Referral ${id} not found`);
    }
    return referral;
  }

  async update(
    id: string,
    dto: UpdateReferralDto,
    currentUser: User,
  ): Promise<Referral> {
    const referral = await this.findById(id);
    const previousAppointmentDate = referral.appointmentDate;

    // Save old values for audit log
    const oldValues: Record<string, any> = {};
    for (const key of Object.keys(dto)) {
      if (dto[key] !== undefined) {
        oldValues[key] = referral[key];
      }
    }

    const { patientId, specialistId, ...rest } = dto;
    Object.assign(referral, rest);
    if (patientId) {
      referral.patient = { id: patientId } as any;
    }
    if (specialistId) {
      referral.specialist = { id: specialistId } as any;
    }
    await this.referralsRepository.save(referral);
    const reloaded = await this.findById(id);

    // Audit log — track what changed, by whom
    await this.auditService.log({
      action: 'REFERRAL_UPDATED',
      user: { id: currentUser.id } as User,
      referral: { id: reloaded.id } as Referral,
      details: {
        changes: Object.keys(oldValues).map((key) => ({
          field: key,
          from: oldValues[key],
          to: dto[key],
        })),
      },
    });

    if (previousAppointmentDate == null && reloaded.appointmentDate != null) {
      await this.notificationsService.onAppointmentScheduled(reloaded);
    }

    return reloaded;
  }
  async transition(
    referralId: string,
    dto: TransitionDto,
    currentUser: User,
  ): Promise<TransitionResponse> {
    const referral = await this.findById(referralId);

    let snapshot: PersistedSnapshot;
    if (referral.xstateSnapshot) {
      snapshot = referral.xstateSnapshot as unknown as PersistedSnapshot;
    } else {
      snapshot = this.workflowService.initializeMachine(referral.id);
    }

    const event = this.buildEvent(dto, referral);
    const before = this.workflowService.getCurrentStatus(snapshot);
    const result = this.workflowService.transition(snapshot, event, referral);

    if (!result.ok) {
      throw new BadRequestException(result.reason ?? 'Transition not allowed');
    }

    const fromStatus = before.status;
    const fromSubstep = before.substep;
    const toStatus = result.status;
    const toSubstep = result.substep;
    const statusChanged = result.statusChanged;

    referral.xstateSnapshot = result.snapshot as unknown as Record<
      string,
      unknown
    >;
    referral.status = toStatus as ReferralStatus;
    referral.currentSubstep = toSubstep || referral.currentSubstep;

    if (toStatus === 'closed' && result.reachedFinal && !referral.completedAt) {
      referral.completedAt = new Date();
    }

    await this.referralsRepository.save(referral);

    if (statusChanged) {
      const history = this.stepHistoryRepository.create({
        referral: { id: referral.id } as Referral,
        fromStatus,
        toStatus,
        fromSubstep,
        toSubstep,
        changedBy: { id: currentUser.id } as User,
        reason: dto.event,
      });
      await this.stepHistoryRepository.save(history);
    }

    await this.auditService.log({
      action: 'REFERRAL_TRANSITION',
      user: { id: currentUser.id } as User,
      referral: { id: referral.id } as Referral,
      details: {
        event: dto.event,
        targetStep: dto.targetStep,
        from: { status: fromStatus, substep: fromSubstep },
        to: { status: toStatus, substep: toSubstep },
        statusChanged,
        reachedFinal: result.reachedFinal,
      },
    });

    const reloaded = await this.findById(referral.id);

    if (statusChanged) {
      this.referralGateway.emitReferralUpdate('referral:status-changed', {
        referralId: reloaded.id,
        oldStatus: fromStatus,
        newStatus: toStatus,
        updatedBy: currentUser.name,
      });

      await this.notificationsService.onStatusChange(
        reloaded,
        fromStatus,
        toStatus,
        currentUser,
      );

      switch (toStatus) {
        case 'submitted':
          await this.notificationsService.onReferralSubmitted(reloaded);
          break;
        case 'authorization':
          await this.notificationsService.onAuthorizationSubmitted(reloaded);
          break;
        case 'closed':
          await this.notificationsService.onReferralClosed(reloaded);
          break;
      }
    }

    const availableTransitions = this.workflowService.getAvailableTransitions(
      reloaded.xstateSnapshot as unknown as PersistedSnapshot,
      reloaded,
    );

    return { referral: reloaded, availableTransitions };
  }

  async getTransitionInfo(
    referralId: string,
  ): Promise<TransitionsInfoResponse> {
    const referral = await this.findById(referralId);
    const snapshot: PersistedSnapshot = referral.xstateSnapshot
      ? (referral.xstateSnapshot as unknown as PersistedSnapshot)
      : this.workflowService.initializeMachine(referral.id);

    const { status, substep } = this.workflowService.getCurrentStatus(snapshot);
    const availableTransitions = this.workflowService.getAvailableTransitions(
      snapshot,
      referral,
    );
    const missingFieldsForNextStep =
      this.workflowService.missingFieldsForNextStep(snapshot, referral);
    const completedSubsteps =
      this.workflowService.getCompletedSubsteps(snapshot);

    return {
      currentStatus: status,
      currentSubstep: substep,
      availableTransitions,
      missingFieldsForNextStep,
      completedSubsteps,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const totalReferrals = await this.referralsRepository.count();

    const closedCount = await this.referralsRepository.count({
      where: { status: ReferralStatus.CLOSED },
    });
    const completionRate =
      totalReferrals > 0 ? closedCount / totalReferrals : 0;

    const pendingAuthorizations = await this.referralsRepository.count({
      where: { authorizationStatus: AuthorizationStatus.PENDING },
    });

    const avgRow = (await this.referralsRepository
      .createQueryBuilder('r')
      .select(
        'AVG(EXTRACT(EPOCH FROM (r.completedAt - r.createdAt)) / 86400)',
        'avgDays',
      )
      .where('r.status = :status', { status: ReferralStatus.CLOSED })
      .andWhere('r.completedAt IS NOT NULL')
      .getRawOne()) as { avgDays: string | null } | undefined;
    const averageCompletionDays = avgRow?.avgDays
      ? parseFloat(avgRow.avgDays)
      : 0;

    const byStatus = (await this.referralsRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .orderBy('r.status', 'ASC')
      .getRawMany()) as { status: string; count: string }[];

    const bySpecialty = (await this.referralsRepository
      .createQueryBuilder('r')
      .select('r.specialty', 'specialty')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.specialty')
      .orderBy('r.specialty', 'ASC')
      .getRawMany()) as { specialty: string; count: string }[];

    const byPriority = (await this.referralsRepository
      .createQueryBuilder('r')
      .select('r.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.priority')
      .orderBy('r.priority', 'ASC')
      .getRawMany()) as { priority: string; count: string }[];

    const authorizationBreakdown = (await this.referralsRepository
      .createQueryBuilder('r')
      .select('r.authorizationStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.authorizationStatus')
      .orderBy('r.authorizationStatus', 'ASC')
      .getRawMany()) as { status: string; count: string }[];

    const trendRows = (await this.referralsRepository
      .createQueryBuilder('r')
      .select("TO_CHAR(r.createdAt, 'YYYY-MM')", 'month')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (r.completedAt - r.createdAt)) / 86400)',
        'averageDays',
      )
      .where('r.status = :status', { status: ReferralStatus.CLOSED })
      .andWhere('r.completedAt IS NOT NULL')
      .groupBy("TO_CHAR(r.createdAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany()) as { month: string; averageDays: string }[];

    return {
      summary: {
        totalReferrals,
        averageCompletionDays,
        completionRate,
        pendingAuthorizations,
      },
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      bySpecialty: bySpecialty.map((r) => ({
        specialty: r.specialty,
        count: parseInt(r.count, 10),
      })),
      byPriority: byPriority.map((r) => ({
        priority: r.priority,
        count: parseInt(r.count, 10),
      })),
      authorizationBreakdown: authorizationBreakdown.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      timeToScheduleTrend: trendRows.map((r) => ({
        month: r.month,
        averageDays: parseFloat(r.averageDays),
      })),
    };
  }

  private buildEvent(
    dto: TransitionDto,
    referral: Referral,
  ): ReferralMachineEvent {
    switch (dto.event) {
      case WorkflowEvent.NEXT_SUBSTEP:
        return { type: 'NEXT_SUBSTEP', referral };
      case WorkflowEvent.PREVIOUS_SUBSTEP:
        return { type: 'PREVIOUS_SUBSTEP', referral };
      case WorkflowEvent.COMPLETE_STEP:
        return { type: 'COMPLETE_STEP', referral };
      case WorkflowEvent.BACK_TO_STEP:
        if (!dto.targetStep) {
          throw new BadRequestException(
            'BACK_TO_STEP requires a targetStep field',
          );
        }
        return {
          type: 'BACK_TO_STEP',
          referral,
          targetStep: dto.targetStep as ReferralStatusValue,
        };
      default:
        throw new BadRequestException(`Unknown event: ${dto.event as string}`);
    }
  }
}
