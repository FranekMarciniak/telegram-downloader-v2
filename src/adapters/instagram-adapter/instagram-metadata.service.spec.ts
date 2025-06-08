import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { InstagramMetadataService } from './instagram-metadata.service';

/* eslint-disable @typescript-eslint/unbound-method */

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InstagramMetadataService', () => {
  let service: InstagramMetadataService;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstagramMetadataService],
    }).compile();

    service = module.get<InstagramMetadataService>(InstagramMetadataService);

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

  describe('instagramGetUrl', () => {
    const testUrl = 'https://www.instagram.com/p/test123/';

    beforeEach(() => {
      // Mock CSRF token request
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        // Mock Instagram GraphQL request
        if (config.url?.includes('graphql/query')) {
          return Promise.resolve({
            data: {
              data: {
                xdt_shortcode_media: {
                  __typename: 'GraphVideo',
                  is_video: true,
                  video_url: 'https://scontent.cdninstagram.com/video.mp4',
                  display_url: 'https://scontent.cdninstagram.com/image.jpg',
                },
              },
            },
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });
    });

    it('should successfully extract video URL from Instagram post', async () => {
      const result = await service.instagramGetUrl(testUrl);

      expect(result).toEqual({
        type: 'video',
        url: 'https://scontent.cdninstagram.com/video.mp4',
      });

      expect(logger.log).toHaveBeenCalledWith(
        `Fetching Instagram metadata for URL: ${testUrl}`,
      );
      expect(logger.log).toHaveBeenCalledWith(
        'Successfully fetched Instagram metadata',
      );
    });

    it('should successfully extract image URL from Instagram post', async () => {
      // Override mock for image post
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        if (config.url?.includes('graphql/query')) {
          return Promise.resolve({
            data: {
              data: {
                xdt_shortcode_media: {
                  __typename: 'GraphImage',
                  is_video: false,
                  video_url: null,
                  display_url: 'https://scontent.cdninstagram.com/image.jpg',
                },
              },
            },
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await service.instagramGetUrl(testUrl);

      expect(result).toEqual({
        type: 'image',
        url: 'https://scontent.cdninstagram.com/image.jpg',
      });
    });

    it('should handle sidecar posts (carousel)', async () => {
      // Override mock for sidecar post
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        if (config.url?.includes('graphql/query')) {
          return Promise.resolve({
            data: {
              data: {
                xdt_shortcode_media: {
                  __typename: 'XDTGraphSidecar',
                  edge_sidecar_to_children: {
                    edges: [
                      {
                        node: {
                          is_video: true,
                          video_url:
                            'https://scontent.cdninstagram.com/carousel-video.mp4',
                          display_url:
                            'https://scontent.cdninstagram.com/carousel-image.jpg',
                        },
                      },
                    ],
                  },
                },
              },
            },
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      const result = await service.instagramGetUrl(testUrl);

      expect(result).toEqual({
        type: 'video',
        url: 'https://scontent.cdninstagram.com/carousel-video.mp4',
      });
    });

    it('should handle share URLs with redirect', async () => {
      const shareUrl = 'https://www.instagram.com/share/p/test123/';

      // Mock redirect for share URL
      mockedAxios.get.mockResolvedValue({
        request: {
          path: '/p/test123/',
        },
      });

      await service.instagramGetUrl(shareUrl);

      expect(mockedAxios.get).toHaveBeenCalledWith(shareUrl);
    });

    it('should retry on rate limiting (429)', async () => {
      let callCount = 0;

      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        if (config.url?.includes('graphql/query')) {
          callCount++;

          if (callCount === 1) {
            const error: any = new Error('Rate limited');
            error.response = {
              status: 429,
              headers: {
                'retry-after': '1',
              },
            };
            error.isAxiosError = true;
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return Promise.reject(error);
          }

          return Promise.resolve({
            data: {
              data: {
                xdt_shortcode_media: {
                  __typename: 'GraphVideo',
                  is_video: true,
                  video_url: 'https://scontent.cdninstagram.com/video.mp4',
                  display_url: 'https://scontent.cdninstagram.com/image.jpg',
                },
              },
            },
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      // Mock isAxiosError
      (axios as any).isAxiosError = jest.fn().mockReturnValue(true);

      const result = await service.instagramGetUrl(testUrl);

      expect(result).toEqual({
        type: 'video',
        url: 'https://scontent.cdninstagram.com/video.mp4',
      });
      expect(callCount).toBe(2); // Should have retried once
    });

    it('should handle missing CSRF token', async () => {
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {}, // No set-cookie header
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      await expect(service.instagramGetUrl(testUrl)).rejects.toThrow(
        'Failed to obtain CSRF',
      );
    });

    it('should handle invalid shortcode in URL', async () => {
      const invalidUrl = 'https://www.instagram.com/p/';

      await expect(service.instagramGetUrl(invalidUrl)).rejects.toThrow(
        'Failed to obtain shortcode',
      );
    });

    it('should handle missing media data in response', async () => {
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        if (config.url?.includes('graphql/query')) {
          return Promise.resolve({
            data: {
              data: {}, // Missing xdt_shortcode_media
            },
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      await expect(service.instagramGetUrl(testUrl)).rejects.toThrow(
        'Only posts/reels supported, check if your link is valid',
      );
    });

    it('should handle network errors', async () => {
      mockedAxios.request.mockRejectedValue(new Error('Network error'));

      await expect(service.instagramGetUrl(testUrl)).rejects.toThrow(
        'Failed to obtain CSRF',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should exhaust retries and fail', async () => {
      mockedAxios.request.mockImplementation((config: any) => {
        if (config.url === 'https://www.instagram.com/') {
          return Promise.resolve({
            headers: {
              'set-cookie': ['csrftoken=test-csrf-token; Path=/'],
            },
          });
        }

        if (config.url?.includes('graphql/query')) {
          const error: any = new Error('Rate limited');
          error.response = {
            status: 429,
            headers: {},
          };
          error.isAxiosError = true;
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          return Promise.reject(error);
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      (axios as any).isAxiosError = jest.fn().mockReturnValue(true);

      await expect(
        service.instagramGetUrl(testUrl, { retries: 1, delay: 10 }),
      ).rejects.toThrow('Failed instagram request');
    });
  });

  describe('private methods', () => {
    describe('getShortcode', () => {
      it('should extract shortcode from regular post URL', () => {
        const url = 'https://www.instagram.com/p/ABC123/';
        const shortcode = (service as any).getShortcode(url);
        expect(shortcode).toBe('ABC123');
      });

      it('should extract shortcode from reel URL', () => {
        const url = 'https://www.instagram.com/reel/XYZ789/';
        const shortcode = (service as any).getShortcode(url);
        expect(shortcode).toBe('XYZ789');
      });

      it('should extract shortcode from TV URL', () => {
        const url = 'https://www.instagram.com/tv/DEF456/';
        const shortcode = (service as any).getShortcode(url);
        expect(shortcode).toBe('DEF456');
      });

      it('should throw error for invalid URL format', () => {
        const url = 'https://www.instagram.com/p/';
        expect(() => (service as any).getShortcode(url)).toThrow(
          'Failed to obtain shortcode',
        );
      });
    });

    describe('isSidecar', () => {
      it('should return true for sidecar posts', () => {
        const requestData = { __typename: 'XDTGraphSidecar' };
        const result = (service as any).isSidecar(requestData);
        expect(result).toBe(true);
      });

      it('should return false for non-sidecar posts', () => {
        const requestData = { __typename: 'GraphVideo' };
        const result = (service as any).isSidecar(requestData);
        expect(result).toBe(false);
      });
    });

    describe('createOutputData', () => {
      it('should create output for video post', () => {
        const requestData = {
          __typename: 'GraphVideo',
          is_video: true,
          video_url: 'https://example.com/video.mp4',
          display_url: 'https://example.com/image.jpg',
        };

        const result = (service as any).createOutputData(requestData);

        expect(result).toEqual({
          type: 'video',
          url: 'https://example.com/video.mp4',
        });
      });

      it('should create output for image post', () => {
        const requestData = {
          __typename: 'GraphImage',
          is_video: false,
          video_url: null,
          display_url: 'https://example.com/image.jpg',
        };

        const result = (service as any).createOutputData(requestData);

        expect(result).toEqual({
          type: 'image',
          url: 'https://example.com/image.jpg',
        });
      });

      it('should create output for sidecar post', () => {
        const requestData = {
          __typename: 'XDTGraphSidecar',
          edge_sidecar_to_children: {
            edges: [
              {
                node: {
                  is_video: true,
                  video_url: 'https://example.com/carousel-video.mp4',
                  display_url: 'https://example.com/carousel-image.jpg',
                },
              },
            ],
          },
        };

        const result = (service as any).createOutputData(requestData);

        expect(result).toEqual({
          type: 'video',
          url: 'https://example.com/carousel-video.mp4',
        });
      });
    });
  });
});
