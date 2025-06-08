import { Module } from '@nestjs/common';
import { VideoProcessingService } from './video-processing.service';

@Module({
  providers: [VideoProcessingService],
  exports: [VideoProcessingService],
})
export class VideoModule {}
