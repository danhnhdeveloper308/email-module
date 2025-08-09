import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiBody} from '@nestjs/swagger';
import {EmailTemplateService} from '../services/email-template.service';
import {CreateTemplateDto} from '../dto/create-template.dto';
import {UpdateTemplateDto} from '../dto/update-template.dto';
import * as Handlebars from 'handlebars';

class PreviewTemplateDto {
  template: string;
  context: Record<string, any>;
}

@ApiTags('email-templates')
@Controller('email-templates')
export class EmailTemplateController {
  constructor(
    // ✅ Direct injection without token
    private templateService: EmailTemplateService,
  ) {}

  @ApiOperation({summary: 'Get all templates'})
  @Get()
  async getAllTemplates() {
    const templates = await this.templateService.findAll();
    return {success: true, templates};
  }

  @ApiOperation({summary: 'Get template by name'})
  @Get(':name')
  async getTemplateByName(@Param('name') name: string) {
    const template = await this.templateService.findByName(name);
    return {success: true, template};
  }

  @ApiOperation({summary: 'Create new template'})
  @Post()
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    const template =
      await this.templateService.createTemplate(createTemplateDto);
    return {success: true, template};
  }

  @ApiOperation({summary: 'Update template'})
  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.templateService.updateTemplate(
      id,
      updateTemplateDto,
    );
    return {success: true, template};
  }

  @ApiOperation({summary: 'Delete template'})
  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return {success: true, message: 'Template deleted successfully'};
  }

  @ApiOperation({summary: 'Preview template with context'})
  @ApiBody({type: PreviewTemplateDto})
  @Post('preview')
  async previewTemplate(@Body() body: PreviewTemplateDto) {
    try {
      const compiled = Handlebars.compile(body.template);
      const html = compiled(body.context);

      return {
        success: true,
        html,
        context: body.context,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
