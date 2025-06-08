import { IsString, IsIn, IsArray } from 'class-validator';

export class DownloadResultDto {
  @IsArray()
  @IsString({ each: true })
  urls: string[];

  @IsIn(['remote', 'local'])
  type: 'remote' | 'local';
}
