import {ApiProperty, PartialType} from '@nestjs/swagger';
import {CreateTemplateDto} from './create-template.dto';
import {IsString, IsOptional, IsBoolean, IsNumber} from 'class-validator';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @ApiProperty({description: 'Template name', required: false})
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({description: 'Template subject', required: false})
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({description: 'Template description', required: false})
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({description: 'Template content (Handlebars)', required: false})
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({description: 'Whether template is active', required: false})
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({description: 'Template category', required: false})
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Template version number',
    example: 2,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiProperty({
    description: 'Email of the last editor',
    example: 'admin@example.com',
    required: false,
  })
  @IsOptional()
  lastEditor?: string;
}
