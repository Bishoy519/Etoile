import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class FamilyLoginDto {
  @IsNotEmpty({ message: 'Barcode, phone, or family identifier is required' })
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  pin?: string;
}
