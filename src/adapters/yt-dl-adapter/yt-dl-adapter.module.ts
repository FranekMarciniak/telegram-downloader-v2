import { Module } from '@nestjs/common';
import { YtDlAdapterService } from './yt-dl-adapter.service';
import { VideoModule } from '../../video/video.module';

@Module({
  imports: [VideoModule],
  providers: [YtDlAdapterService],
  exports: [YtDlAdapterService],
})
export class YtDlAdapterModule {}
