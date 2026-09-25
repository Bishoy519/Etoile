import { IsOptional, IsString, IsBoolean, IsInt, IsArray, IsIn, Matches, MinLength } from 'class-validator';

export class CreateBlogPostDto {
  @IsOptional() @IsString() @Matches(/^[a-z0-9-]+$/) slug?: string;
  @IsOptional() @IsString() slugAr?: string;
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(3) titleAr!: string;
  @IsString() @MinLength(10) excerpt!: string;
  @IsString() @MinLength(10) excerptAr!: string;
  @IsString() @MinLength(20) content!: string;
  @IsString() @MinLength(20) contentAr!: string;
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() videoEmbedCode?: string;
  @IsOptional() @IsArray() galleryImages?: string[];
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() @IsIn(['draft', 'published', 'archived']) status?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsInt() readingMinutes?: number;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
}
