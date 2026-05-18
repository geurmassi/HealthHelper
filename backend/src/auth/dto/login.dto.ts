import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Request body for POST /auth/login.
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
