import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  ReferralPriority,
  ReferralType,
  Specialty,
} from '../referral.entity';

export class CreateReferralDto {
  @IsUUID()
  patientId: string;

  @IsEnum(ReferralType)
  referralType: ReferralType;

  @IsEnum(Specialty)
  specialty: Specialty;

  @IsOptional()
  @IsEnum(ReferralPriority)
  priority?: ReferralPriority;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clinicalReason?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  requestedProcedure?: string;
}
