import {ApiProperty} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import {Type} from 'class-transformer';

export class BulkEmailRecipientDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Recipient name',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Custom context for this recipient',
    example: {userId: '123', customField: 'value'},
    required: false,
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class BulkEmailDto {
  @ApiProperty({
    description: 'List of recipients',
    type: [BulkEmailRecipientDto],
  })
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => BulkEmailRecipientDto)
  recipients: BulkEmailRecipientDto[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Monthly Newsletter',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Template name',
    example: 'newsletter',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiProperty({
    description: 'Global context variables',
    example: {companyName: 'My Company', month: 'January'},
    required: false,
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}
