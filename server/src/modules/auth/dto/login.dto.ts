import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Email or staff identifier

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  password: string;
}
