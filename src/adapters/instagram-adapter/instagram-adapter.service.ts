// This code is from https://github.com/victorsouzaleal/instagram-direct-url/blob/main/src/instagram.ts all credits to the author @victorsouzaleal on github
import { Injectable, Logger } from '@nestjs/common';
import { InstagramMetadataService } from './instagram-metadata.service';
import { SocialMediaDownloader } from 'src/common/interfaces/social-media-downloader.interface';

@Injectable()
export class InstagramAdapterService implements SocialMediaDownloader {
  private readonly logger = new Logger(InstagramAdapterService.name);

  constructor(
    private readonly instagramMetadataService: InstagramMetadataService,
  ) {}

  async getFileUrl(
    url: string,
  ): Promise<{ urls: string[]; type: 'remote' | 'local' }> {
    this.logger.log(`Processing Instagram URL: ${url}`);
    try {
      const instagramResponse =
        await this.instagramMetadataService.instagramGetUrl(url);
      const downloadUrl = instagramResponse.url;
      this.logger.log(`Successfully extracted download URL`);
      return { urls: [downloadUrl], type: 'remote' };
    } catch (error) {
      this.logger.error(
        `Failed to get Instagram download URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
