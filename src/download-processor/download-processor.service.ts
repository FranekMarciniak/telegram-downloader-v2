import { Injectable, Logger } from '@nestjs/common';
import { SocialMediaDownloader } from 'src/common/interfaces/social-media-downloader.interface';
import { InstagramAdapterService } from 'src/adapters/instagram-adapter/instagram-adapter.service';
import { YtDlAdapterService } from 'src/adapters/yt-dl-adapter/yt-dl-adapter.service';
import { DownloadResultDto } from 'src/common/dto';

@Injectable()
export class DownloadProcessorService {
  private readonly logger = new Logger(DownloadProcessorService.name);
  private readonly downloaders: Map<string, SocialMediaDownloader>;

  constructor(
    private readonly instagramAdapter: InstagramAdapterService,
    private readonly ytDlAdapter: YtDlAdapterService,
  ) {
    this.downloaders = new Map<string, SocialMediaDownloader>([
      ['instagram.com', this.instagramAdapter],
      ['www.instagram.com', this.instagramAdapter],
      ['youtube.com', this.ytDlAdapter],
      ['www.youtube.com', this.ytDlAdapter],
      ['youtu.be', this.ytDlAdapter],
      ['tumblr.com', this.ytDlAdapter],
      ['www.tumblr.com', this.ytDlAdapter],
      ['twitter.com', this.ytDlAdapter],
      ['www.twitter.com', this.ytDlAdapter],
      ['x.com', this.ytDlAdapter],
      ['www.x.com', this.ytDlAdapter],
      ['tiktok.com', this.ytDlAdapter],
      ['www.tiktok.com', this.ytDlAdapter],
      ['facebook.com', this.ytDlAdapter],
      ['www.facebook.com', this.ytDlAdapter],
    ]);
  }

  async processUrl(url: string): Promise<DownloadResultDto | null> {
    this.logger.log(`Processing URL: ${url}`);

    try {
      this.validateUrl(url);

      const downloader = this.getDownloader(url);
      if (!downloader) {
        const error = new Error(`No suitable downloader found for URL: ${url}`);
        this.logger.warn(error.message);
        return null;
      }

      const downloadData = await downloader.getFileUrl(url);

      this.logger.log(
        `Successfully processed URL: ${url} -> ${downloadData.urls.join(', ')}`,
      );
      return { urls: downloadData.urls, type: downloadData.type };
    } catch (error) {
      this.logger.error(`Failed to process URL: ${url}`, error.stack);
      throw error;
    }
  }

  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  private getDownloader(url: string): SocialMediaDownloader | undefined {
    try {
      const domain = new URL(url).hostname;
      return this.downloaders.get(domain);
    } catch {
      return undefined;
    }
  }

  getSupportedDomains(): string[] {
    return Array.from(this.downloaders.keys());
  }
}
