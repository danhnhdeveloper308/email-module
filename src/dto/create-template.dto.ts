import {ApiProperty} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template name (unique identifier)',
    example: 'welcome-email',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Email subject line template',
    example: 'Welcome to {{appName}}',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Welcome email sent to new users',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Template content in Handlebars format',
    example: '<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Whether the template is active',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Preview text for email clients',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(250)
  previewText?: string;

  @ApiProperty({
    description: 'Template category',
    example: 'authentication',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}
