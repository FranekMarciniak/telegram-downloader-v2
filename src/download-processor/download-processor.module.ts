import { Module } from '@nestjs/common';
import { DownloadProcessorService } from './download-processor.service';
import { InstagramAdapterModule } from 'src/adapters/instagram-adapter/instagram-adapter.module';
import { YtDlAdapterModule } from 'src/adapters/yt-dl-adapter/yt-dl-adapter.module';

@Module({
  imports: [InstagramAdapterModule, YtDlAdapterModule],
  providers: [DownloadProcessorService],
  exports: [DownloadProcessorService],
})
export class DownloadProcessorModule {}
