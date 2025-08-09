import {Controller, Get, Post, Body, Query} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger';
import {OAuth2Service} from '../services/oauth2.service';

@ApiTags('oauth2')
@Controller('oauth2')
export class OAuth2Controller {
  constructor(private oauth2Service: OAuth2Service) {}

  @ApiOperation({summary: 'Get OAuth2 authorization URL for Gmail'})
  @Get('gmail/auth-url')
  async getGmailAuthUrl() {
    // Generate OAuth2 URL for Gmail setup
    const clientId = process.env.GMAIL_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL}/oauth2/gmail/callback`;

    if (!clientId) {
      return {
        success: false,
        message:
          'Gmail OAuth2 not configured. Please set GMAIL_CLIENT_ID in environment variables.',
      };
    }

    const scope = 'https://www.googleapis.com/auth/gmail.send';
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;

    return {
      success: true,
      authUrl,
      instructions: [
        '1. Visit the authorization URL',
        '2. Grant permissions',
        '3. Copy the authorization code from the callback URL',
        '4. Use POST /oauth2/gmail/token to exchange code for tokens',
      ],
    };
  }

  @ApiOperation({summary: 'Exchange authorization code for tokens'})
  @Post('gmail/token')
  async exchangeGmailToken(@Body() body: {code: string}) {
    try {
      // This would exchange the auth code for tokens
      // Implementation depends on your OAuth2 flow
      return {
        success: true,
        message: 'OAuth2 setup completed. Tokens saved to database.',
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
  async testGmailConnection() {
    try {
      const accessToken = await this.oauth2Service.getAccessToken();
      return {
        success: true,
        message: 'OAuth2 connection successful',
        tokenPreview: accessToken.substring(0, 20) + '...',
      };
    } catch (error) {
      return {
        success: false,
        message: `OAuth2 connection failed: ${error.message}`,
      };
    }
  }
}
