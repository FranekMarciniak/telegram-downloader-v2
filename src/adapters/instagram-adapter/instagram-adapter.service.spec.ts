import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InstagramAdapterService } from './instagram-adapter.service';
import {
  InstagramMetadataService,
  InstagramResponse,
} from './instagram-metadata.service';

/* eslint-disable @typescript-eslint/unbound-method */

describe('InstagramAdapterService', () => {
  let service: InstagramAdapterService;
  let metadataService: jest.Mocked<InstagramMetadataService>;
  let logger: jest.Mocked<Logger>;

  const mockMetadataService = {
    instagramGetUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramAdapterService,
        {
          provide: InstagramMetadataService,
          useValue: mockMetadataService,
        },
      ],
    }).compile();

    service = module.get<InstagramAdapterService>(InstagramAdapterService);
    metadataService = module.get(InstagramMetadataService);

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFileUrl', () => {
    const testUrl = 'https://www.instagram.com/p/test123/';

    it('should successfully extract video URL from Instagram post', async () => {
      const mockResponse: InstagramResponse = {
        url: 'https://scontent.cdninstagram.com/video.mp4',
        type: 'video',
      };

      metadataService.instagramGetUrl.mockResolvedValue(mockResponse);

      const result = await service.getFileUrl(testUrl);

      expect(result).toEqual({
        urls: [mockResponse.url],
        type: 'remote',
      });
      expect(metadataService.instagramGetUrl).toHaveBeenCalledWith(testUrl);
      expect(logger.log).toHaveBeenCalledWith(
        `Processing Instagram URL: ${testUrl}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Successfully extracted download URL',
      );
    });

    it('should successfully extract image URL from Instagram post', async () => {
      const mockResponse: InstagramResponse = {
        url: 'https://scontent.cdninstagram.com/image.jpg',
        type: 'image',
      };

      metadataService.instagramGetUrl.mockResolvedValue(mockResponse);

      const result = await service.getFileUrl(testUrl);

      expect(result).toEqual({
        urls: [mockResponse.url],
        type: 'remote',
      });
      expect(metadataService.instagramGetUrl).toHaveBeenCalledWith(testUrl);
    });

    it('should handle metadata service errors gracefully', async () => {
      const errorMessage = 'Failed to extract metadata';
      const error = new Error(errorMessage);
      error.stack = 'Error stack trace';

      metadataService.instagramGetUrl.mockRejectedValue(error);

      await expect(service.getFileUrl(testUrl)).rejects.toThrow(errorMessage);

      expect(metadataService.instagramGetUrl).toHaveBeenCalledWith(testUrl);
      expect(logger.log).toHaveBeenCalledWith(
        `Processing Instagram URL: ${testUrl}`,
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to get Instagram download URL: ${errorMessage}`,
        error.stack,
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.stack = 'Timeout stack trace';

      metadataService.instagramGetUrl.mockRejectedValue(timeoutError);

      await expect(service.getFileUrl(testUrl)).rejects.toThrow(
        'Request timeout',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get Instagram download URL: Request timeout',
        timeoutError.stack,
      );
    });

    it('should handle private post errors', async () => {
      const privateError = new Error('Post is private or not accessible');
      privateError.stack = 'Private error stack trace';

      metadataService.instagramGetUrl.mockRejectedValue(privateError);

      await expect(service.getFileUrl(testUrl)).rejects.toThrow(
        'Post is private or not accessible',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get Instagram download URL: Post is private or not accessible',
        privateError.stack,
      );
    });

    it('should handle invalid URL format', async () => {
      const invalidUrl = 'https://www.instagram.com/invalid';
      const invalidError = new Error('Invalid Instagram URL format');
      invalidError.stack = 'Invalid URL stack trace';

      metadataService.instagramGetUrl.mockRejectedValue(invalidError);

      await expect(service.getFileUrl(invalidUrl)).rejects.toThrow(
        'Invalid Instagram URL format',
      );

      expect(metadataService.instagramGetUrl).toHaveBeenCalledWith(invalidUrl);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get Instagram download URL: Invalid Instagram URL format',
        invalidError.stack,
      );
    });

    it('should always return remote type for Instagram URLs', async () => {
      const mockResponse: InstagramResponse = {
        url: 'https://scontent.cdninstagram.com/test.mp4',
        type: 'video',
      };

      metadataService.instagramGetUrl.mockResolvedValue(mockResponse);

      const result = await service.getFileUrl(testUrl);

      expect(result.type).toBe('remote');
    });

    it('should preserve the original URL from metadata service', async () => {
      const originalUrl =
        'https://scontent.cdninstagram.com/specific-video.mp4';
      const mockResponse: InstagramResponse = {
        url: originalUrl,
        type: 'video',
      };

      metadataService.instagramGetUrl.mockResolvedValue(mockResponse);

      const result = await service.getFileUrl(testUrl);

      expect(result.urls).toEqual([originalUrl]);
    });
  });
});
