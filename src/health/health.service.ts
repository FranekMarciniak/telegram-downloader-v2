import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

export interface ReadinessStatus {
  status: 'ready' | 'not-ready';
  checks: {
    config: boolean;
    dependencies: boolean;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  getHealthStatus(): HealthStatus {
    const uptime = Date.now() - this.startTime;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000), // in seconds
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      version: process.env.npm_package_version || '0.0.1',
    };
  }

  getReadinessStatus(): ReadinessStatus {
    const configCheck = this.checkConfiguration();
    const dependenciesCheck = this.checkDependencies();

    return {
      status: configCheck && dependenciesCheck ? 'ready' : 'not-ready',
      checks: {
        config: configCheck,
        dependencies: dependenciesCheck,
      },
    };
  }

  private checkConfiguration(): boolean {
    try {
      const telegramToken = this.configService.get<string>('telegram.token');
      return !!telegramToken;
    } catch (error) {
      this.logger.error('Configuration check failed', error.stack);
      return false;
    }
  }

  private checkDependencies(): boolean {
    // In a real application, you might check database connections,
    // external API availability, etc.
    return true;
  }
}
