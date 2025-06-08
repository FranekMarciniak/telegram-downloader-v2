import { Module } from '@nestjs/common';
import { InstagramMetadataService } from './instagram-metadata.service';
import { InstagramAdapterService } from './instagram-adapter.service';

@Module({
  imports: [],
  providers: [InstagramAdapterService, InstagramMetadataService],
  exports: [InstagramAdapterService],
})
export class InstagramAdapterModule {}
