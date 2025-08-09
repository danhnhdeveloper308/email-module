import {Inject, createParamDecorator, ExecutionContext} from '@nestjs/common';
import {
  EMAIL_SERVICE_TOKEN,
  EMAIL_TRACKING_SERVICE_TOKEN,
  EMAIL_TEMPLATE_SERVICE_TOKEN,
} from '../constants';

export const InjectEmailService = () => Inject(EMAIL_SERVICE_TOKEN);
export const InjectEmailTrackingService = () =>
  Inject(EMAIL_TRACKING_SERVICE_TOKEN);
export const InjectEmailTemplateService = () =>
  Inject(EMAIL_TEMPLATE_SERVICE_TOKEN);

export const GetEmailId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.emailId;
  },
);

export const GetTrackingInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
      timestamp: new Date(),
    };
  },
);
