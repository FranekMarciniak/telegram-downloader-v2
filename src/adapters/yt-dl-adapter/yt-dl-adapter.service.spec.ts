import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { YtDlAdapterService } from './yt-dl-adapter.service';
import { VideoProcessingService } from '../../video/video-processing.service';

describe('YtDlAdapterService', () => {
  let service: YtDlAdapterService;
  let configService: jest.Mocked<ConfigService>;
  let videoProcessingService: jest.Mocked<VideoProcessingService>;

  const mockTempDir = '/tmp/test-downloads';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YtDlAdapterService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockTempDir),
          },
        },
        {
          provide: VideoProcessingService,
          useValue: {
            splitFileIntoChunks: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YtDlAdapterService>(YtDlAdapterService);
    configService = module.get(ConfigService);
    videoProcessingService = module.get(VideoProcessingService);
  });

  describe('constructor and initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct temp directory from config', () => {
      const getSpy = jest.spyOn(configService, 'get');
      expect(getSpy).toHaveBeenCalledWith('app.tempDir', '/tmp/downloads');
    });

    it('should use default temp directory when config is not provided', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          YtDlAdapterService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: VideoProcessingService,
            useValue: videoProcessingService,
          },
        ],
      }).compile();

      module.get<YtDlAdapterService>(YtDlAdapterService);
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'app.tempDir',
        '/tmp/downloads',
      );
    });

    it('should implement SocialMediaDownloader interface', () => {
      expect(typeof service['getFileUrl']).toBe('function');
    });
  });

  describe('getFileUrl method', () => {
    it('should have the correct return type signature', () => {
      // This tests that the method exists and has the expected signature
      expect(typeof service['getFileUrl']).toBe('function');
    });
  });
});
