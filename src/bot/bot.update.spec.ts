import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { DownloadProcessorService } from '../download-processor/download-processor.service';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

interface DownloadResultDto {
  urls: string[];
  type: 'remote' | 'local';
}

describe('BotUpdate', () => {
  let botUpdate: BotUpdate;
  let downloadProcessorService: jest.Mocked<DownloadProcessorService>;
  let logger: jest.Mocked<Logger>;

  const mockDownloadProcessorService = {
    processUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotUpdate,
        {
          provide: DownloadProcessorService,
          useValue: mockDownloadProcessorService,
        },
      ],
    }).compile();

    botUpdate = module.get<BotUpdate>(BotUpdate);
    downloadProcessorService = module.get(DownloadProcessorService);

    // Mock the logger
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Replace the logger instance
    (botUpdate as any).logger = logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(botUpdate).toBeDefined();
  });

  describe('onMessage', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: 123,
          text: 'Check out this video: https://www.youtube.com/watch?v=test123',
        },
        replyWithChatAction: jest.fn().mockResolvedValue(undefined),
        replyWithVideo: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue(undefined),
      };
    });

    describe('successful processing', () => {
      it('should process YouTube URL and send local video', async () => {
        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/youtube_video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(mockContext);

        expect(logger.log).toHaveBeenCalledWith(
          'Received message: Check out this video: https://www.youtube.com/watch?v=test123...',
        );
        expect(logger.log).toHaveBeenCalledWith(
          'Processing URL: https://www.youtube.com/watch?v=test123',
        );
        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://www.youtube.com/watch?v=test123',
        );
        expect(mockContext.replyWithVideo).toHaveBeenCalledWith(
          {
            filename: '/tmp/youtube_video.mp4',
            source: '/tmp/youtube_video.mp4',
          },
          {
            reply_parameters: {
              message_id: 123,
            },
          },
        );
        expect(logger.log).toHaveBeenCalledWith(
          'Successfully processed and sent video for URL: https://www.youtube.com/watch?v=test123',
        );
      });

      it('should process Instagram URL and send remote video', async () => {
        const downloadResult: DownloadResultDto = {
          urls: ['https://scontent.cdninstagram.com/video.mp4'],
          type: 'remote',
        };

        const instagramContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Instagram post: https://www.instagram.com/p/test123/',
          },
        };
        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(instagramContext);

        expect(logger.log).toHaveBeenCalledWith(
          'Processing URL: https://www.instagram.com/p/test123/',
        );
        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://www.instagram.com/p/test123/',
        );
        expect(instagramContext.replyWithVideo).toHaveBeenCalledWith(
          { url: 'https://scontent.cdninstagram.com/video.mp4' },
          {
            reply_parameters: {
              message_id: 123,
            },
          },
        );
        expect(logger.log).toHaveBeenCalledWith(
          'Successfully processed and sent video for URL: https://www.instagram.com/p/test123/',
        );
      });

      it('should handle long messages by truncating log', async () => {
        const longMessage =
          'A'.repeat(200) + ' https://www.youtube.com/watch?v=test123';
        const longMessageContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: longMessage,
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(longMessageContext);

        expect(logger.log).toHaveBeenCalledWith(
          `Received message: ${longMessage.substring(0, 100)}...`,
        );
      });

      it('should handle multiple URLs in message (first URL)', async () => {
        const multiUrlContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Check these: https://www.youtube.com/watch?v=first https://www.instagram.com/p/second/',
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(multiUrlContext);

        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://www.youtube.com/watch?v=first',
        );
        expect(logger.log).toHaveBeenCalledWith(
          'Processing URL: https://www.youtube.com/watch?v=first',
        );
      });
    });

    describe('message filtering', () => {
      it('should ignore non-text messages', async () => {
        const photoContext = {
          ...mockContext,
          message: {
            message_id: 123,
            photo: [{ file_id: 'photo123' }],
          },
        };

        await botUpdate.onMessage(photoContext);

        expect(downloadProcessorService.processUrl).not.toHaveBeenCalled();
        expect(photoContext.replyWithVideo).not.toHaveBeenCalled();
        expect(logger.log).not.toHaveBeenCalled();
      });

      it('should ignore messages without URLs', async () => {
        const noUrlContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Hello, this is just a regular message without any links!',
          },
        };

        await botUpdate.onMessage(noUrlContext);

        expect(logger.log).toHaveBeenCalledWith(
          'Received message: Hello, this is just a regular message without any links!...',
        );
        expect(downloadProcessorService.processUrl).not.toHaveBeenCalled();
        expect(noUrlContext.replyWithVideo).not.toHaveBeenCalled();
      });

      it('should process HTTP URLs', async () => {
        const httpContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Check this: http://example.com/video',
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(httpContext);

        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'http://example.com/video',
        );
      });

      it('should handle empty text messages', async () => {
        const emptyContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: '',
          },
        };

        await botUpdate.onMessage(emptyContext);

        expect(downloadProcessorService.processUrl).not.toHaveBeenCalled();
      });

      it('should handle undefined message', async () => {
        const undefinedContext = {
          ...mockContext,
          message: undefined,
        };

        await botUpdate.onMessage(undefinedContext);

        expect(downloadProcessorService.processUrl).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle download processor errors with message_id', async () => {
        const error = new Error('Download failed');
        error.stack = 'Error stack trace';
        downloadProcessorService.processUrl.mockRejectedValue(error);

        await botUpdate.onMessage(mockContext);

        expect(logger.error).toHaveBeenCalledWith(
          'Error processing message: Download failed',
          'Error stack trace',
        );
        expect(mockContext.reply).toHaveBeenCalledWith(
          '❌ Sorry, I encountered an error while processing your request. Please try again later.',
          {
            reply_parameters: {
              message_id: 123,
            },
          },
        );
      });

      it('should handle download processor errors without message_id', async () => {
        const error = new Error('Network timeout');
        error.stack = 'Timeout stack trace';
        downloadProcessorService.processUrl.mockRejectedValue(error);

        // Remove message_id to simulate scenario without it
        delete mockContext.message.message_id;

        await botUpdate.onMessage(mockContext);

        expect(logger.error).toHaveBeenCalledWith(
          'Error processing message: Network timeout',
          'Timeout stack trace',
        );
        expect(mockContext.reply).toHaveBeenCalledWith(
          '❌ Sorry, I encountered an error while processing your request. Please try again later.',
        );
      });

      it('should handle telegram API errors during video reply', async () => {
        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        const telegramError = new Error('Telegram API error');
        telegramError.stack = 'Telegram error stack';
        mockContext.replyWithVideo.mockRejectedValue(telegramError);

        await botUpdate.onMessage(mockContext);

        expect(logger.error).toHaveBeenCalledWith(
          'Error processing message: Telegram API error',
          'Telegram error stack',
        );
        expect(mockContext.reply).toHaveBeenCalledWith(
          '❌ Sorry, I encountered an error while processing your request. Please try again later.',
          {
            reply_parameters: {
              message_id: 123,
            },
          },
        );
      });

      it('should handle errors when error reply also fails', async () => {
        const downloadError = new Error('Download failed');
        downloadError.stack = 'Download error stack';
        downloadProcessorService.processUrl.mockRejectedValue(downloadError);

        const replyError = new Error('Reply failed');
        mockContext.reply.mockRejectedValue(replyError);

        // Should not throw despite nested errors - but actually the error does propagate
        await expect(botUpdate.onMessage(mockContext)).rejects.toThrow(
          'Reply failed',
        );

        expect(logger.error).toHaveBeenCalledWith(
          'Error processing message: Download failed',
          'Download error stack',
        );
      });
    });

    describe('URL variations', () => {
      it('should handle URL with query parameters', async () => {
        const queryParamContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Video: https://www.youtube.com/watch?v=test123&t=30s',
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(queryParamContext);

        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://www.youtube.com/watch?v=test123&t=30s',
        );
      });

      it('should handle URL with fragment', async () => {
        const fragmentContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: 'Link: https://example.com/video#section',
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(fragmentContext);

        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://example.com/video#section',
        );
      });

      it('should handle URL in the middle of text', async () => {
        const middleUrlContext = {
          ...mockContext,
          message: {
            message_id: 123,
            text: "Watch this amazing video https://youtu.be/abc123 it's great!",
          },
        };

        const downloadResult: DownloadResultDto = {
          urls: ['/tmp/video.mp4'],
          type: 'local',
        };

        downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

        await botUpdate.onMessage(middleUrlContext);

        expect(downloadProcessorService.processUrl).toHaveBeenCalledWith(
          'https://youtu.be/abc123',
        );
      });
    });
  });

  describe('isTextMessage (private method)', () => {
    it('should return true for valid text messages', () => {
      const validMessages = [
        { text: 'Hello world', message_id: 123 },
        { text: '', message_id: 456 },
        { text: 'https://example.com', message_id: 789 },
      ];

      validMessages.forEach((message) => {
        const result = (botUpdate as any).isTextMessage(message);
        expect(result).toBe(true);
      });
    });

    it('should return false for invalid messages', () => {
      // Test null specifically - returns falsy value
      expect((botUpdate as any).isTextMessage(null)).toBeFalsy();

      // Test undefined specifically - returns falsy value
      expect((botUpdate as any).isTextMessage(undefined)).toBeFalsy();

      // Test other invalid messages
      const invalidMessages = [
        {},
        { message_id: 123 }, // missing text
        { text: 123, message_id: 456 }, // text is not string
        'string',
        123,
        [],
      ];

      invalidMessages.forEach((message) => {
        const result = (botUpdate as any).isTextMessage(message);
        expect(result).toBe(false);
      });
    });

    it('should return true for messages with text but no message_id', () => {
      const messageWithoutId = { text: 'Hello' };
      const result = (botUpdate as any).isTextMessage(messageWithoutId);
      expect(result).toBe(true);
    });

    it('should handle messages with additional properties', () => {
      const messageWithExtras = {
        text: 'Hello world',
        message_id: 123,
        from: { id: 456, first_name: 'John' },
        date: 1234567890,
        chat: { id: 789, type: 'private' },
      };

      const result = (botUpdate as any).isTextMessage(messageWithExtras);
      expect(result).toBe(true);
    });
  });

  describe('extractUrl (private method)', () => {
    it('should extract HTTPS URLs correctly', () => {
      const testCases = [
        {
          text: 'Check out https://www.youtube.com/watch?v=test123',
          expected: 'https://www.youtube.com/watch?v=test123',
        },
        {
          text: 'Video: https://youtu.be/abc123',
          expected: 'https://youtu.be/abc123',
        },
        {
          text: 'https://www.instagram.com/p/test/',
          expected: 'https://www.instagram.com/p/test/',
        },
        {
          text: 'Multiple https://first.com and https://second.com',
          expected: 'https://first.com', // Should return first match
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = (botUpdate as any).extractUrl(text);
        expect(result).toBe(expected);
      });
    });

    it('should extract HTTP URLs correctly', () => {
      const testCases = [
        {
          text: 'Old link: http://example.com/video',
          expected: 'http://example.com/video',
        },
        {
          text: 'http://test.com/path?param=value',
          expected: 'http://test.com/path?param=value',
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = (botUpdate as any).extractUrl(text);
        expect(result).toBe(expected);
      });
    });

    it('should return null for text without URLs', () => {
      const testCases = [
        'Hello world',
        'No links here',
        '',
        'ftp://not-http-protocol.com',
        'www.example.com', // No protocol
        'https:// incomplete',
        'Check this: htp://typo.com', // Typo in protocol
      ];

      testCases.forEach((text) => {
        const result = (botUpdate as any).extractUrl(text);
        expect(result).toBeNull();
      });
    });

    it('should handle URLs with special characters', () => {
      const testCases = [
        {
          text: 'https://example.com/path?param=value&other=123#section',
          expected: 'https://example.com/path?param=value&other=123#section',
        },
        {
          text: 'Link: https://sub.domain.co.uk/complex-path_with/symbols',
          expected: 'https://sub.domain.co.uk/complex-path_with/symbols',
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = (botUpdate as any).extractUrl(text);
        expect(result).toBe(expected);
      });
    });

    it('should handle URLs at different positions in text', () => {
      const testCases = [
        {
          text: 'https://start.com beginning of text',
          expected: 'https://start.com',
        },
        {
          text: 'Middle of text https://middle.com more text',
          expected: 'https://middle.com',
        },
        {
          text: 'End of text https://end.com',
          expected: 'https://end.com',
        },
      ];

      testCases.forEach(({ text, expected }) => {
        const result = (botUpdate as any).extractUrl(text);
        expect(result).toBe(expected);
      });
    });

    it('should stop at whitespace boundaries', () => {
      const text = 'Check https://example.com/video this is after';
      const result = (botUpdate as any).extractUrl(text);
      expect(result).toBe('https://example.com/video');
    });
  });

  describe('integration scenarios', () => {
    let integrationContext: any;

    beforeEach(() => {
      integrationContext = {
        message: {
          message_id: 123,
          text: 'https://www.youtube.com/watch?v=test123',
        },
        replyWithChatAction: jest.fn().mockResolvedValue(undefined),
        replyWithVideo: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should handle complete flow for local video', async () => {
      const downloadResult: DownloadResultDto = {
        urls: ['/tmp/video.mp4'],
        type: 'local',
      };

      downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

      await botUpdate.onMessage(integrationContext);

      // Verify complete flow
      expect(logger.log).toHaveBeenCalledTimes(3);
      expect(downloadProcessorService.processUrl).toHaveBeenCalledTimes(1);
      expect(integrationContext.replyWithVideo).toHaveBeenCalledTimes(1);
      expect(integrationContext.reply).not.toHaveBeenCalled();
    });

    it('should handle complete flow for remote video', async () => {
      const downloadResult: DownloadResultDto = {
        urls: ['https://remote.example.com/video.mp4'],
        type: 'remote',
      };

      downloadProcessorService.processUrl.mockResolvedValue(downloadResult);

      await botUpdate.onMessage(integrationContext);

      // Verify complete flow
      expect(logger.log).toHaveBeenCalledTimes(3);
      expect(downloadProcessorService.processUrl).toHaveBeenCalledTimes(1);
      expect(integrationContext.replyWithVideo).toHaveBeenCalledTimes(1);
      expect(integrationContext.reply).not.toHaveBeenCalled();
    });

    it('should handle complete error flow', async () => {
      const error = new Error('Processing failed');
      error.stack = 'Error stack';
      downloadProcessorService.processUrl.mockRejectedValue(error);

      await botUpdate.onMessage(integrationContext);

      // Verify error flow
      expect(logger.log).toHaveBeenCalledTimes(2); // Initial message + URL processing
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(downloadProcessorService.processUrl).toHaveBeenCalledTimes(1);
      expect(integrationContext.replyWithVideo).not.toHaveBeenCalled();
      expect(integrationContext.reply).toHaveBeenCalledTimes(1);
    });
  });
});
