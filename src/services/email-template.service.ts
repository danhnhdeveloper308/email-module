import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {EmailTemplate} from '../entities/email-template.entity';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
  ) {}

  async createTemplate(
    templateData: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    try {
      // Validate template syntax
      if (templateData.content) {
        Handlebars.compile(templateData.content);
      }

      const template = this.templateRepository.create(templateData);
      return await this.templateRepository.save(template);
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    updates: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    try {
      // Validate template syntax if content is being updated
      if (updates.content) {
        Handlebars.compile(updates.content);
      }

      await this.templateRepository.update(id, updates);
      
      const updatedTemplate = await this.templateRepository.findOne({where: {id}});
      
      if (!updatedTemplate) {
        throw new Error(`Template with ID ${id} not found`);
      }
      
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<EmailTemplate[]> {
    return await this.templateRepository.find({order: {createdAt: 'DESC'}});
  }

  async findByName(name: string): Promise<EmailTemplate | null> {
    return await this.templateRepository.findOne({where: {name}});
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }
}
