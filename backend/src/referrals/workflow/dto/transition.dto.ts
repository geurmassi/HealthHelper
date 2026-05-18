import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export enum WorkflowEvent {
  NEXT_SUBSTEP = 'NEXT_SUBSTEP',
  PREVIOUS_SUBSTEP = 'PREVIOUS_SUBSTEP',
  COMPLETE_STEP = 'COMPLETE_STEP',
  BACK_TO_STEP = 'BACK_TO_STEP',
}

const VALID_TARGETS = [
  'intake',
  'clinical_prep',
  'authorization',
  'ready_to_submit',
  'submitted',
  'scheduling',
  'closed',
] as const;

export class TransitionDto {
  @IsEnum(WorkflowEvent)
  event: WorkflowEvent;

  @IsOptional()
  @IsString()
  @IsIn(VALID_TARGETS as unknown as string[])
  targetStep?: string;
}
