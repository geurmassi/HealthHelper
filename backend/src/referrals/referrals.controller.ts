import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralPriority, ReferralStatus, Specialty } from './referral.entity';
import { ReferralsService } from './referrals.service';
import { TransitionDto } from './workflow/dto/transition.dto';
import {HistoryService} from "./history/history.service"

@Controller('referrals')
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly historyService: HistoryService,
  ) {}

  @Roles(UserRole.PHYSICIAN, UserRole.NURSE_PRACTITIONER)
  @Post()
  create(@Body() dto: CreateReferralDto, @CurrentUser() user: User) {
    return this.referralsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(ReferralStatus, { optional: true }))
    status?: ReferralStatus,
    @Query('priority', new ParseEnumPipe(ReferralPriority, { optional: true }))
    priority?: ReferralPriority,
    @Query('specialty', new ParseEnumPipe(Specialty, { optional: true }))
    specialty?: Specialty,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('DESC'))
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.referralsService.findAll({
      status,
      priority,
      specialty,
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      fromDate,
      toDate,
    });
  }

  // Registered before :id so Nest's route matcher doesn't capture "stats" as an :id parameter.
  @Get('stats/dashboard')
  getDashboardStats() {
    return this.referralsService.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralsService.findById(id);
  }

  @Roles(UserRole.PHYSICIAN, UserRole.ADMIN_STAFF, UserRole.NURSE_PRACTITIONER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralDto,
    @CurrentUser() user: User,
  ) {
    return this.referralsService.update(id, dto, user);
  }

  @Get(':id/transitions')
  getTransitions(@Param('id', ParseUUIDPipe) id: string) {
    return this.referralsService.getTransitionInfo(id);
  }

  @Roles(UserRole.PHYSICIAN, UserRole.ADMIN_STAFF, UserRole.NURSE_PRACTITIONER)
  @Post(':id/transition')
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDto,
    @CurrentUser() user: User,
  ) {
    return this.referralsService.transition(id, dto, user);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.historyService.getHistoryInfo(id);
  }
}
