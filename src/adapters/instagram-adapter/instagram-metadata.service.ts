// This code is from https://github.com/victorsouzaleal/instagram-direct-url/blob/main/src/instagram.ts all credits to the author @victorsouzaleal on github
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qs = require('qs');

export interface InstagramResponse {
  type: 'video' | 'image';
  url: string;
}

interface InstagramRequestData {
  __typename: string;
  edge_sidecar_to_children?: {
    edges: Array<{
      node: {
        is_video: boolean;
        video_url: string;
        display_url: string;
      };
    }>;
  };
  is_video: boolean;
  video_url: string;
  display_url: string;
}

@Injectable()
export class InstagramMetadataService {
  private readonly logger = new Logger(InstagramMetadataService.name);

  private readonly BASE_URL = 'https://www.instagram.com/graphql/query';
  private readonly INSTAGRAM_DOCUMENT_ID = '9510064595728286';
  private readonly POST_TAGS = ['p', 'reel', 'tv', 'reels'];

  async instagramGetUrl(
    url_media: string,
    config = { retries: 5, delay: 1000 },
  ): Promise<InstagramResponse> {
    this.logger.log(`Fetching Instagram metadata for URL: ${url_media}`);
    try {
      const redirectedUrl = await this.checkRedirect(url_media);
      const shortcode = this.getShortcode(redirectedUrl);
      const instagramRequest = await this.instagramRequest(
        shortcode,
        config.retries,
        config.delay,
      );
      this.logger.log('Successfully fetched Instagram metadata');
      return this.createOutputData(instagramRequest);
    } catch (error) {
      this.logger.error(
        'Failed to fetch Instagram metadata',
        error instanceof Error ? error.stack : error,
      );
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  private async checkRedirect(url: string): Promise<string> {
    const split_url = url.split('/');
    if (split_url.includes('share')) {
      const res = await axios.get(url);
      return res.request.path;
    }
    return url;
  }

  private getShortcode(url: string): string {
    try {
      const split_url = url.split('/');
      const index_shortcode =
        split_url.findIndex((item) => this.POST_TAGS.includes(item)) + 1;
      const shortcode = split_url[index_shortcode];
      if (!shortcode) {
        throw new Error('Shortcode not found in URL');
      }
      return shortcode;
    } catch (err) {
      throw new Error(
        `Failed to obtain shortcode: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  private async getCSRFToken(): Promise<string> {
    try {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: 'https://www.instagram.com/',
      };

      const response = await axios.request(config);
      const cookies = response.headers['set-cookie'];

      if (!cookies) {
        throw new Error('CSRF token not found in response headers');
      }

      const csrfCookie = cookies[0];
      return csrfCookie.split(';')[0].replace('csrftoken=', '');
    } catch (err) {
      throw new Error(
        `Failed to obtain CSRF: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  private isSidecar(requestData: InstagramRequestData): boolean {
    return requestData.__typename === 'XDTGraphSidecar';
  }

  private async instagramRequest(
    shortcode: string,
    retries: number,
    delay: number,
  ): Promise<InstagramRequestData> {
    try {
      const dataBody = qs.stringify({
        variables: JSON.stringify({
          shortcode,
          fetch_tagged_user_count: null,
          hoisted_comment_id: null,
          hoisted_reply_id: null,
        }),
        doc_id: this.INSTAGRAM_DOCUMENT_ID,
      });

      const token = await this.getCSRFToken();

      const config: AxiosRequestConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: this.BASE_URL,
        headers: {
          'X-CSRFToken': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: dataBody,
      };

      const { data } = await axios.request(config);
      if (!data.data?.xdt_shortcode_media) {
        throw new Error(
          'Only posts/reels supported, check if your link is valid',
        );
      }
      return data.data.xdt_shortcode_media;
    } catch (err) {
      const errorCodes = [429, 403];

      if (
        axios.isAxiosError(err) &&
        err.response &&
        errorCodes.includes(err.response.status) &&
        retries > 0
      ) {
        const retryAfter = err.response.headers['retry-after'];
        const waitTime = retryAfter
          ? parseInt(String(retryAfter)) * 1000
          : delay;
        await new Promise((res) => setTimeout(res, waitTime));
        return this.instagramRequest(shortcode, retries - 1, delay * 2);
      }

      throw new Error(
        `Failed instagram request: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  private createOutputData(
    requestData: InstagramRequestData,
  ): InstagramResponse {
    try {
      const IS_SIDECAR = this.isSidecar(requestData);

      if (IS_SIDECAR && requestData.edge_sidecar_to_children) {
        const firstMedia = requestData.edge_sidecar_to_children.edges[0].node;
        return {
          type: firstMedia.is_video ? 'video' : 'image',
          url: firstMedia.is_video
            ? firstMedia.video_url
            : firstMedia.display_url,
        };
      }

      return {
        type: requestData.is_video ? 'video' : 'image',
        url: requestData.is_video
          ? requestData.video_url
          : requestData.display_url,
      };
    } catch (err) {
      throw new Error(
        `Failed to create output data: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }
}
