import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {OAuthCredential} from '../entities/oauth-credential.entity';

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);
  private cachedTokens: Map<string, {token: string; expiresAt: number}> =
    new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(OAuthCredential)
    private oauthRepository: Repository<OAuthCredential>,
  ) {}

  async getAccessToken(): Promise<string> {
    const cacheKey = 'gmail-token';
    const cached = this.cachedTokens.get(cacheKey);

    // Return cached token if not expired
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // Try to get refresh token from database
    const credentials = await this.oauthRepository.findOne({
      where: {provider: 'gmail', isActive: true},
      order: {createdAt: 'DESC'},
    });

    if (!credentials?.refreshToken) {
      const envRefreshToken = this.configService.get<string>(
        'GMAIL_REFRESH_TOKEN',
      );
      if (!envRefreshToken) {
        throw new Error('No refresh token available for Gmail');
      }
      return this.refreshToken(envRefreshToken);
    }

    return this.refreshToken(credentials.refreshToken);
  }

  private async refreshToken(refreshToken: string): Promise<string> {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Gmail OAuth credentials');
    }

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${error}`);
      }

      const data = await response.json();

      // Cache the token
      const expiresAt = Date.now() + data.expires_in * 1000 - 60000; // 1 min buffer
      this.cachedTokens.set('gmail-token', {
        token: data.access_token,
        expiresAt,
      });

      // Update stored credentials
      await this.updateCredentials({
        accessToken: data.access_token,
        refreshToken,
        expiresAt: new Date(expiresAt),
      });

      this.logger.log('Successfully refreshed Gmail access token');
      return data.access_token;
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }

  private async updateCredentials(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<void> {
    try {
      const credential = await this.oauthRepository.findOne({
        where: {provider: 'gmail', isActive: true},
      });

      if (credential) {
        credential.accessToken = tokens.accessToken;
        credential.expiresAt = tokens.expiresAt;
        await this.oauthRepository.save(credential);
      } else {
        // Create new credential
        const newCredential = this.oauthRepository.create({
          provider: 'gmail',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          isActive: true,
        });
        await this.oauthRepository.save(newCredential);
      }
    } catch (error) {
      this.logger.error(`Failed to update credentials: ${error.message}`);
    }
  }
}
