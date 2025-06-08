import { registerAs } from '@nestjs/config';

export interface TelegramConfig {
  token: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  tempDir: string;
}

export const telegramConfig = registerAs(
  'telegram',
  (): TelegramConfig => ({
    token: process.env.TELEGRAM_BOT_TOKEN || '',
  }),
);

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    tempDir:
      process.env.DOWNLOAD_PATH || process.env.TEMP_DIR || '/tmp/downloads',
  }),
);

export default () => ({
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    tempDir:
      process.env.DOWNLOAD_PATH || process.env.TEMP_DIR || '/tmp/downloads',
  },
});
