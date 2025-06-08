import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'telegram.token') return 'test-token';
              if (key === 'app.nodeEnv') return 'test';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const status = service.getHealthStatus();

      expect(status).toBeDefined();
      expect(status.status).toBe('ok');
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
      expect(status.environment).toBe('test');
      expect(status.version).toBeDefined();
    });
  });

  describe('getReadinessStatus', () => {
    it('should return ready status when config is valid', () => {
      const status = service.getReadinessStatus();

      expect(status).toBeDefined();
      expect(status.status).toBe('ready');
      expect(status.checks.config).toBe(true);
      expect(status.checks.dependencies).toBe(true);
    });

    it('should return not-ready status when config is invalid', () => {
      // Mock empty token
      jest.spyOn(configService, 'get').mockReturnValue('');

      const status = service.getReadinessStatus();

      expect(status.status).toBe('not-ready');
      expect(status.checks.config).toBe(false);
    });
  });
});
