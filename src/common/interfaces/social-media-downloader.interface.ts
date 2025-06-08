export interface SocialMediaDownloader {
  getFileUrl(
    url: string,
  ):
    | Promise<{ urls: string[]; type: 'remote' | 'local' }>
    | { urls: string[]; type: 'remote' | 'local' };
}
