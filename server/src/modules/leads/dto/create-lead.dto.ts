import { IsNotEmpty, IsString, IsEmail, IsInt, IsOptional, IsISO8601, Min } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsString()
  dancerName: string;

  @IsNotEmpty()
  @IsInt()
  @Min(3)
  age: number;

  @IsNotEmpty()
  @IsString()
  parentName: string;

  @IsNotEmpty()
  @IsString()
  parentPhone: string;

  @IsNotEmpty()
  @IsEmail()
  parentEmail: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  division?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;
}
