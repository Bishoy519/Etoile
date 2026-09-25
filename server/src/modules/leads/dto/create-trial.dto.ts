import { IsNotEmpty, IsString, IsEmail, IsInt, IsOptional, Min, IsISO8601 } from 'class-validator';

export class CreateTrialDto {
  @IsNotEmpty()
  @IsString()
  dancerName!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(3)
  age!: number;

  @IsNotEmpty()
  @IsString()
  parentName!: string;

  @IsNotEmpty()
  @IsString()
  parentPhone!: string;

  @IsNotEmpty()
  @IsEmail()
  parentEmail!: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @IsString()
  division?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsNotEmpty()
  @IsISO8601()
  preferredSlot!: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;
}
