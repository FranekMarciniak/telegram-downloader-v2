import { Logger } from '@nestjs/common';
import { Update, Ctx, On } from 'nestjs-telegraf';
import { DownloadProcessorService } from 'src/download-processor/download-processor.service';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly downloadProcessorService: DownloadProcessorService,
  ) {}

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    try {
      if (!this.isTextMessage(ctx.message)) {
        return;
      }

      const messageId = ctx.message.message_id;
      const messageText = ctx.message.text;

      this.logger.log(`Received message: ${messageText.substring(0, 100)}...`);

      const url = this.extractUrl(messageText);
      if (!url) {
        return;
      }

      this.logger.log(`Processing URL: ${url}`);

      const { urls, type } =
        await this.downloadProcessorService.processUrl(url);

      if (type === 'local') {
        for (let index = 0; index < urls.length; index++) {
          const url = urls[index];
          if (urls.length > 1) {
            await ctx.reply(`PART ${index + 1} of ${urls.length}`, {
              reply_parameters: {
                message_id: messageId,
              },
            });
          }
          await ctx.replyWithVideo(
            { filename: url, source: url },
            {
              reply_parameters: {
                message_id: messageId,
              },
            },
          );
        }
      } else {
        for (let index = 0; index < urls.length; index++) {
          const url = urls[index];
          if (urls.length > 1) {
            await ctx.reply(`PART ${index + 1} of ${urls.length}`, {
              reply_parameters: {
                message_id: messageId,
              },
            });
          }
          await ctx.replyWithVideo(
            { url },
            {
              reply_parameters: {
                message_id: messageId,
              },
            },
          );
        }
      }

      this.logger.log(`Successfully processed and sent video for URL: ${url}`);
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error.message}`,
        error.stack,
      );

      if (ctx.message?.message_id) {
        await ctx.reply(
          '❌ Sorry, I encountered an error while processing your request. Please try again later.',
          {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          },
        );
      } else {
        await ctx.reply(
          '❌ Sorry, I encountered an error while processing your request. Please try again later.',
        );
      }
    }
  }

  private isTextMessage(
    message: any,
  ): message is { text: string; message_id: number } {
    return (
      message &&
      typeof message === 'object' &&
      'text' in message &&
      typeof message.text === 'string'
    );
  }

  private extractUrl(text: string): string | null {
    const urlRegex = /https?:\/\/[^\s]+/;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }
}
