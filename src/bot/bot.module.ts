import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { DownloadProcessorModule } from 'src/download-processor/download-processor.module';

@Module({
  providers: [BotUpdate],
  imports: [
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('telegram.token');
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        return { token };
      },
    }),
    DownloadProcessorModule,
  ],
})
export class BotModule {}
