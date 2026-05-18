import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  AuthorizationStatus,
  ReferralStatus,
} from '../referral.entity';
import { CreateReferralDto } from './create-referral.dto';

export class UpdateReferralDto extends PartialType(CreateReferralDto) {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  currentSubstep?: string;

  @IsOptional()
  @IsEnum(AuthorizationStatus)
  authorizationStatus?: AuthorizationStatus;

  @IsOptional()
  @IsString()
  authorizationNumber?: string;

  @IsOptional()
  @IsString()
  authorizationNotes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appointmentDate?: Date;

  @IsOptional()
  @IsString()
  appointmentLocation?: string;

  @IsOptional()
  @IsString()
  specialistReport?: string;

  @IsOptional()
  @IsUUID()
  specialistId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt?: Date;
}
