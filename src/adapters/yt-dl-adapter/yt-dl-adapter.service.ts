import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialMediaDownloader } from 'src/common/interfaces/social-media-downloader.interface';
import { VideoProcessingService } from '../../video/video-processing.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

@Injectable()
export class YtDlAdapterService implements SocialMediaDownloader {
  private readonly logger = new Logger(YtDlAdapterService.name);
  private readonly tempDir: string;
  private readonly MAX_VIDEO_LENGTH_IN_SECONDS: number = 180;

  constructor(
    private readonly configService: ConfigService,
    private readonly videoProcessingService: VideoProcessingService,
  ) {
    this.tempDir = this.configService.get<string>(
      'app.tempDir',
      '/tmp/downloads',
    );
    this.logger.log(`Initialized with temp directory: ${this.tempDir}`);

    this.initializeDirectory().catch((error) => {
      this.logger.error(
        `Failed to initialize download directory: ${error.message}`,
      );
    });
  }

  private async initializeDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true, mode: 0o755 });
      await fs.access(this.tempDir, fs.constants.W_OK);
      this.logger.log(`Download directory is ready: ${this.tempDir}`);
    } catch (error) {
      this.logger.error(
        `Download directory initialization failed: ${error.message}`,
      );
      throw error;
    }
  }

  async getFileUrl(
    url: string,
  ): Promise<{ urls: string[]; type: 'remote' | 'local' }> {
    const fileName = this.generateFileName(url);
    this.logger.log(`Processing YouTube/Generic URL: ${url}`);

    try {
      const filePaths = await this.downloadLocalFile(url, fileName);
      this.logger.log(
        `Successfully downloaded and processed file(s): ${filePaths.length} chunk(s) created`,
      );
      return { urls: filePaths, type: 'local' };
    } catch (error) {
      this.logger.error(`Failed to download from URL: ${url}`, error.stack);
      throw error;
    }
  }

  private async downloadLocalFile(
    url: string,
    fileName: string,
  ): Promise<string[]> {
    const filePath = join(this.tempDir, fileName);

    this.logger.debug(`Target file path: ${filePath}`);
    this.logger.debug(`Temp directory: ${this.tempDir}`);

    try {
      // Ensure temp directory exists with proper permissions
      await fs.mkdir(this.tempDir, { recursive: true, mode: 0o755 });

      // Verify directory is writable
      await fs.access(this.tempDir, fs.constants.W_OK);

      this.logger.debug(`Directory ${this.tempDir} is writable`);
    } catch (error) {
      this.logger.error(
        `Failed to create or access temp directory ${this.tempDir}: ${error.message}`,
      );
      throw new Error(`Directory access error: ${error.message}`);
    }

    //query the file size via yt-dlp --skip-download --print "filesize" url
    const fileMetadata = await execAsync(`yt-dlp -J "${url}"`);
    try {
      const fileDuration = parseInt(JSON.parse(fileMetadata.stdout)?.duration);
      this.logger.debug(`File duration: ${fileDuration} seconds`);
      if (
        fileDuration > this.MAX_VIDEO_LENGTH_IN_SECONDS &&
        fileDuration !== 0
      ) {
        const errorMessage = `File duration is above ${this.MAX_VIDEO_LENGTH_IN_SECONDS} seconds, skipping download`;
        this.logger.warn(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = `Failed to parse file size: ${error.message}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const command = `yt-dlp "${url}" -o "${filePath}" --no-playlist -S res,ext:mp4:m4a --recode mp4`;
    this.logger.debug(`Executing command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes timeout
        cwd: this.tempDir, // Set working directory
      });

      if (stdout) {
        this.logger.debug(`yt-dlp stdout: ${stdout}`);
      }

      if (stderr) {
        this.logger.warn(`yt-dlp stderr: ${stderr}`);
      }

      // Verify file exists and is accessible
      try {
        await fs.access(filePath, fs.constants.R_OK);
        const stats = await fs.stat(filePath);
        this.logger.debug(
          `File created successfully: ${filePath} (${stats.size} bytes)`,
        );
      } catch (accessError) {
        this.logger.error(
          `File was not created or is not accessible: ${filePath}`,
        );
        throw new Error(
          `Downloaded file not accessible: ${accessError.message}`,
        );
      }

      const chunkFilenames =
        await this.videoProcessingService.splitFileIntoChunks(filePath);
      this.logger.log(
        `File processing complete. Created ${chunkFilenames.length} chunk(s)`,
      );

      return chunkFilenames;
    } catch (error) {
      this.logger.error(`yt-dlp command failed: ${error.message}`);
      this.logger.error(`Command was: ${command}`);

      // Try to list directory contents for debugging
      try {
        const files = await fs.readdir(this.tempDir);
        this.logger.debug(`Files in temp directory: ${files.join(', ')}`);
      } catch (listError) {
        this.logger.debug(
          `Could not list temp directory: ${listError.message}`,
        );
      }

      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  private generateFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const timestamp = Date.now();
      return `${hostname}_${timestamp}.mp4`;
    } catch {
      return `video_${Date.now()}.mp4`;
    }
  }
}
