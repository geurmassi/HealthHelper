import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

// HTTP surface for managing user accounts.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // TODO (production): protect behind an admin-only guard or invite-token flow — open sign-up is unsafe for a clinical staff app.
  @Public()
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
