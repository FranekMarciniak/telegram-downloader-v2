import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DownloadProcessorService } from './download-processor.service';
import { InstagramAdapterService } from 'src/adapters/instagram-adapter/instagram-adapter.service';
import { YtDlAdapterService } from 'src/adapters/yt-dl-adapter/yt-dl-adapter.service';

interface DownloadResultDto {
  urls: string[];
  type: 'remote' | 'local';
}

/* eslint-disable @typescript-eslint/unbound-method */

describe('DownloadProcessorService', () => {
  let service: DownloadProcessorService;
  let instagramAdapter: jest.Mocked<InstagramAdapterService>;
  let ytDlAdapter: jest.Mocked<YtDlAdapterService>;
  let logger: jest.Mocked<Logger>;

  const mockInstagramAdapter = {
    getFileUrl: jest.fn(),
  };

  const mockYtDlAdapter = {
    getFileUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadProcessorService,
        {
          provide: InstagramAdapterService,
          useValue: mockInstagramAdapter,
        },
        {
          provide: YtDlAdapterService,
          useValue: mockYtDlAdapter,
        },
      ],
    }).compile();

    service = module.get<DownloadProcessorService>(DownloadProcessorService);
    instagramAdapter = module.get(InstagramAdapterService);
    ytDlAdapter = module.get(YtDlAdapterService);

    // Mock the logger
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Replace the logger instance
    (service as any).logger = logger;
  });

  // Test data constants
  const instagramResult: DownloadResultDto = {
    urls: ['https://scontent.cdninstagram.com/video.mp4'],
    type: 'remote',
  };

  const ytDlResult: DownloadResultDto = {
    urls: ['/tmp/youtube_video.mp4'],
    type: 'local',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize downloaders map with correct domain mappings', () => {
      const supportedDomains = service.getSupportedDomains();

      // Instagram domains
      expect(supportedDomains).toContain('instagram.com');
      expect(supportedDomains).toContain('www.instagram.com');

      // YouTube domains
      expect(supportedDomains).toContain('youtube.com');
      expect(supportedDomains).toContain('www.youtube.com');
      expect(supportedDomains).toContain('youtu.be');

      // Social media domains
      expect(supportedDomains).toContain('twitter.com');
      expect(supportedDomains).toContain('www.twitter.com');
      expect(supportedDomains).toContain('x.com');
      expect(supportedDomains).toContain('www.x.com');
      expect(supportedDomains).toContain('tiktok.com');
      expect(supportedDomains).toContain('www.tiktok.com');
      expect(supportedDomains).toContain('facebook.com');
      expect(supportedDomains).toContain('www.facebook.com');
      expect(supportedDomains).toContain('tumblr.com');
      expect(supportedDomains).toContain('www.tumblr.com');

      // Should have 15 total domains
      expect(supportedDomains).toHaveLength(15);
    });
  });

  describe('processUrl', () => {
    describe('Instagram URLs', () => {
      it('should process Instagram URL successfully', async () => {
        const url = 'https://www.instagram.com/p/test123/';
        instagramAdapter.getFileUrl.mockResolvedValue(instagramResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(instagramResult);
        expect(instagramAdapter.getFileUrl).toHaveBeenCalledWith(url);
        expect(ytDlAdapter.getFileUrl).not.toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(`Processing URL: ${url}`);
        expect(logger.log).toHaveBeenCalledWith(
          `Successfully processed URL: ${url} -> ${instagramResult.urls.join(', ')}`,
        );
      });

      it('should process Instagram URL without www prefix', async () => {
        const url = 'https://instagram.com/p/test123/';
        instagramAdapter.getFileUrl.mockResolvedValue(instagramResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(instagramResult);
        expect(instagramAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });
    });

    describe('YouTube URLs', () => {
      it('should process YouTube URL successfully', async () => {
        const url = 'https://www.youtube.com/watch?v=test123';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
        expect(instagramAdapter.getFileUrl).not.toHaveBeenCalled();
        expect(logger.log).toHaveBeenCalledWith(`Processing URL: ${url}`);
        expect(logger.log).toHaveBeenCalledWith(
          `Successfully processed URL: ${url} -> ${ytDlResult.urls.join(', ')}`,
        );
      });

      it('should process YouTube short URL successfully', async () => {
        const url = 'https://youtu.be/test123';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });

      it('should process YouTube URL without www prefix', async () => {
        const url = 'https://youtube.com/watch?v=test123';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });
    });

    describe('Other supported platforms', () => {
      it('should process TikTok URL successfully', async () => {
        const url = 'https://www.tiktok.com/@user/video/123456';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });

      it('should process Twitter URL successfully', async () => {
        const url = 'https://twitter.com/user/status/123456';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });

      it('should process X.com URL successfully', async () => {
        const url = 'https://x.com/user/status/123456';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });

      it('should process Facebook URL successfully', async () => {
        const url = 'https://www.facebook.com/video/123456';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });

      it('should process Tumblr URL successfully', async () => {
        const url = 'https://www.tumblr.com/post/123456';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(url);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
      });
    });

    describe('Error handling', () => {
      it('should throw error for invalid URL format', async () => {
        const invalidUrl = 'not-a-valid-url';

        await expect(service.processUrl(invalidUrl)).rejects.toThrow(
          'Invalid URL format: not-a-valid-url',
        );

        expect(logger.log).toHaveBeenCalledWith(
          `Processing URL: ${invalidUrl}`,
        );
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to process URL: ${invalidUrl}`,
          expect.any(String),
        );
        expect(instagramAdapter.getFileUrl).not.toHaveBeenCalled();
        expect(ytDlAdapter.getFileUrl).not.toHaveBeenCalled();
      });

      it('should throw error for unsupported domain', async () => {
        const unsupportedUrl = 'https://unsupported-domain.com/video';

        await expect(service.processUrl(unsupportedUrl))

        expect(logger.log).toHaveBeenCalledWith(
          `Processing URL: ${unsupportedUrl}`,
        );
        expect(logger.warn).toHaveBeenCalledWith(
          'No suitable downloader found for URL: https://unsupported-domain.com/video',
        );
      });

      it('should handle adapter errors and re-throw them', async () => {
        const url = 'https://www.youtube.com/watch?v=test123';
        const adapterError = new Error('Download failed');
        ytDlAdapter.getFileUrl.mockRejectedValue(adapterError);

        await expect(service.processUrl(url)).rejects.toThrow(
          'Download failed',
        );

        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(url);
        expect(logger.log).toHaveBeenCalledWith(`Processing URL: ${url}`);
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to process URL: ${url}`,
          expect.any(String),
        );
      });

      it('should handle Instagram adapter errors', async () => {
        const url = 'https://www.instagram.com/p/test123/';
        const adapterError = new Error('Instagram extraction failed');
        instagramAdapter.getFileUrl.mockRejectedValue(adapterError);

        await expect(service.processUrl(url)).rejects.toThrow(
          'Instagram extraction failed',
        );

        expect(instagramAdapter.getFileUrl).toHaveBeenCalledWith(url);
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to process URL: ${url}`,
          expect.any(String),
        );
      });
    });

    describe('URL validation edge cases', () => {
      it('should handle malformed URLs with protocol', async () => {
        const malformedUrl = 'https://';

        await expect(service.processUrl(malformedUrl)).rejects.toThrow(
          'Invalid URL format: https://',
        );
      });

      it('should handle URLs with special characters', async () => {
        const specialUrl =
          'https://www.youtube.com/watch?v=test&t=30s&list=playlist';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(specialUrl);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(specialUrl);
      });

      it('should handle URLs with ports', async () => {
        const urlWithPort = 'https://www.youtube.com:443/watch?v=test123';
        ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

        const result = await service.processUrl(urlWithPort);

        expect(result).toEqual(ytDlResult);
        expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(urlWithPort);
      });
    });
  });

  describe('validateUrl (private method)', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=test123',
        'https://instagram.com/p/test123/',
        'http://example.com',
        'https://subdomain.example.com/path',
      ];

      validUrls.forEach((url) => {
        expect(() => (service as any).validateUrl(url)).not.toThrow();
      });
    });

    it('should throw error for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://',
        '',
        '://invalid',
        'just-text',
      ];

      invalidUrls.forEach((url) => {
        expect(() => (service as any).validateUrl(url)).toThrow(
          `Invalid URL format: ${url}`,
        );
      });
    });
  });

  describe('getDownloader (private method)', () => {
    it('should return Instagram adapter for Instagram domains', () => {
      const instagramUrls = [
        'https://www.instagram.com/p/test123/',
        'https://instagram.com/p/test123/',
      ];

      instagramUrls.forEach((url) => {
        const downloader = (service as any).getDownloader(url);
        expect(downloader).toBe(instagramAdapter);
      });
    });

    it('should return YT-DL adapter for YouTube domains', () => {
      const youtubeUrls = [
        'https://www.youtube.com/watch?v=test123',
        'https://youtube.com/watch?v=test123',
        'https://youtu.be/test123',
      ];

      youtubeUrls.forEach((url) => {
        const downloader = (service as any).getDownloader(url);
        expect(downloader).toBe(ytDlAdapter);
      });
    });

    it('should return YT-DL adapter for other supported platforms', () => {
      const otherUrls = [
        'https://www.tiktok.com/@user/video/123456',
        'https://twitter.com/user/status/123456',
        'https://x.com/user/status/123456',
        'https://www.facebook.com/video/123456',
        'https://www.tumblr.com/post/123456',
      ];

      otherUrls.forEach((url) => {
        const downloader = (service as any).getDownloader(url);
        expect(downloader).toBe(ytDlAdapter);
      });
    });

    it('should return undefined for unsupported domains', () => {
      const unsupportedUrls = [
        'https://unsupported-domain.com/video',
        'https://example.com/video',
        'https://vimeo.com/123456',
      ];

      unsupportedUrls.forEach((url) => {
        const downloader = (service as any).getDownloader(url);
        expect(downloader).toBeUndefined();
      });
    });

    it('should return undefined for invalid URLs', () => {
      const invalidUrls = ['not-a-url', '', 'javascript:alert("xss")'];

      invalidUrls.forEach((url) => {
        const downloader = (service as any).getDownloader(url);
        expect(downloader).toBeUndefined();
      });
    });
  });

  describe('getSupportedDomains', () => {
    it('should return all supported domains', () => {
      const domains = service.getSupportedDomains();

      expect(domains).toEqual(
        expect.arrayContaining([
          'instagram.com',
          'www.instagram.com',
          'youtube.com',
          'www.youtube.com',
          'youtu.be',
          'tumblr.com',
          'www.tumblr.com',
          'twitter.com',
          'www.twitter.com',
          'x.com',
          'www.x.com',
          'tiktok.com',
          'www.tiktok.com',
          'facebook.com',
          'www.facebook.com',
        ]),
      );
    });

    it('should return domains in an array', () => {
      const domains = service.getSupportedDomains();
      expect(Array.isArray(domains)).toBe(true);
    });

    it('should not include duplicate domains', () => {
      const domains = service.getSupportedDomains();
      const uniqueDomains = [...new Set(domains)];
      expect(domains).toHaveLength(uniqueDomains.length);
    });
  });

  describe('integration scenarios', () => {
    it('should process multiple URLs of different types', async () => {
      const urls = [
        'https://www.instagram.com/p/test123/',
        'https://www.youtube.com/watch?v=test123',
        'https://www.tiktok.com/@user/video/123456',
      ];

      instagramAdapter.getFileUrl.mockResolvedValue(instagramResult);
      ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);

      const results = await Promise.all(
        urls.map((url) => service.processUrl(url)),
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(instagramResult); // Instagram
      expect(results[1]).toEqual(ytDlResult); // YouTube
      expect(results[2]).toEqual(ytDlResult); // TikTok

      expect(instagramAdapter.getFileUrl).toHaveBeenCalledTimes(1);
      expect(ytDlAdapter.getFileUrl).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const successUrl = 'https://www.youtube.com/watch?v=test123';
      const failureUrl = 'https://www.instagram.com/p/private/';

      ytDlAdapter.getFileUrl.mockResolvedValue(ytDlResult);
      instagramAdapter.getFileUrl.mockRejectedValue(new Error('Private post'));

      // Success case
      const successResult = await service.processUrl(successUrl);
      expect(successResult).toEqual(ytDlResult);

      // Failure case
      await expect(service.processUrl(failureUrl)).rejects.toThrow(
        'Private post',
      );

      expect(ytDlAdapter.getFileUrl).toHaveBeenCalledWith(successUrl);
      expect(instagramAdapter.getFileUrl).toHaveBeenCalledWith(failureUrl);
    });
  });
});
