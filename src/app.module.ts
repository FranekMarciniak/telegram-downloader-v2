import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotModule } from './bot/bot.module';
import { DownloadProcessorModule } from './download-processor/download-processor.module';
import { YtDlAdapterModule } from './adapters/yt-dl-adapter/yt-dl-adapter.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { telegramConfig, appConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [telegramConfig, appConfig],
      cache: true,
      expandVariables: true,
    }),
    CommonModule,
    HealthModule,
    BotModule,
    DownloadProcessorModule,
    YtDlAdapterModule,
  ],
  providers: [],
})
export class AppModule {}
