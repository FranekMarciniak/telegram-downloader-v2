import { IsUrl, IsString } from 'class-validator';

export class ProcessUrlDto {
  @IsUrl({}, { message: 'Invalid URL format' })
  @IsString()
  url: string;
}
