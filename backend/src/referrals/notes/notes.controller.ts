import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { User } from '../../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { ReferralNotesService } from './notes.service';

@Controller('referrals/:id/notes')
export class ReferralNotesController {
  constructor(private readonly notesService: ReferralNotesService) {}

  @Post()
  create(
    @Param('id', ParseUUIDPipe) referralId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: User,
  ) {
    return this.notesService.create(referralId, dto, user);
  }

  @Get()
  findAll(@Param('id', ParseUUIDPipe) referralId: string) {
    return this.notesService.findAllForReferral(referralId);
  }
}
