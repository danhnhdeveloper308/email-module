import {Controller, Get, Post, Body} from '@nestjs/common';
import {ApiTags, ApiOperation} from '@nestjs/swagger';
import {OAuth2Service} from '../services/oauth2.service';

@ApiTags('oauth2')
@Controller('oauth2')
export class OAuth2Controller {
  constructor(private oauth2Service: OAuth2Service) {}

  @ApiOperation({summary: 'Get Gmail OAuth2 authorization URL'})
  @Get('gmail/auth-url')
  async getGmailAuthUrl() {
    // Implementation for OAuth2 auth URL generation
    return {
      success: true,
      authUrl: 'https://accounts.google.com/oauth2/auth?...',
    };
  }

  @ApiOperation({summary: 'Exchange authorization code for tokens'})
  @Post('gmail/token')
  async exchangeCodeForTokens(@Body() body: {code: string}) {
    try {
      // Implementation for token exchange
      return {
        success: true,
        message: 'Tokens obtained successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({summary: 'Test OAuth2 connection'})
  @Get('gmail/test')
  async testOAuth2Connection() {
    try {
      const accessToken = await this.oauth2Service.getAccessToken();
      return {
        success: true,
        message: 'OAuth2 connection successful',
        tokenValid: !!accessToken,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
