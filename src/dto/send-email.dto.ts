import {ApiProperty} from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsDateString,
  MaxLength,
} from 'class-validator';
import {Type, Transform} from 'class-transformer';

export class EmailAttachmentDto {
  @ApiProperty({
    description: 'File name',
    example: 'document.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'File content (base64 encoded or buffer)',
    example: 'base64encodedcontent...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'MIME content type',
    example: 'application/pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiProperty({
    description: 'Content ID for inline attachments',
    required: false,
  })
  @IsString()
  @IsOptional()
  cid?: string;
}

export class EmailOptionsDto {
  @ApiProperty({
    description: 'Sender email address',
    example: 'sender@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({
    description: 'CC recipients',
    required: false,
  })
  @IsOptional()
  cc?: string | string[];

  @ApiProperty({
    description: 'BCC recipients',
    required: false,
  })
  @IsOptional()
  bcc?: string | string[];

  @ApiProperty({
    description: 'Email attachments',
    type: [EmailAttachmentDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({each: true})
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiProperty({
    description: 'Email tags for categorization',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({each: true})
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Campaign ID for tracking',
    required: false,
  })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiProperty({
    description: 'Batch ID for bulk operations',
    required: false,
  })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({
    description: 'Enable open tracking',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trackOpens?: boolean;

  @ApiProperty({
    description: 'Enable click tracking',
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trackClicks?: boolean;

  @ApiProperty({
    description: 'Scheduled delivery time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  deliveryTime?: Date;

  @ApiProperty({
    description: 'User ID for tracking',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Email priority',
    enum: ['high', 'normal', 'low'],
    default: 'normal',
    required: false,
  })
  @IsString()
  @IsOptional()
  priority?: 'high' | 'normal' | 'low';

  @ApiProperty({
    description: 'Reply-to email address',
    required: false,
  })
  @IsString()
  @IsOptional()
  replyTo?: string;
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address(es)',
    example: 'recipient@example.com',
  })
  @IsEmail({}, {each: true})
  @Transform(({value}) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    if (Array.isArray(value)) {
      return value.map(email => email.toLowerCase().trim());
    }
    return value;
  })
  @IsOptional()
  to?: string | string[];

  @ApiProperty({
    description: 'Email subject line',
    example: 'Welcome to our service',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({value}) => value?.trim())
  subject: string;

  @ApiProperty({
    description: 'Template name to use for the email',
    example: 'welcome',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiProperty({
    description: 'Context variables for template rendering',
    example: {
      name: 'John Doe',
      activationLink: 'https://example.com/activate/token123',
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiProperty({
    description: 'Additional email options',
    type: EmailOptionsDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmailOptionsDto)
  options?: EmailOptionsDto;
}
