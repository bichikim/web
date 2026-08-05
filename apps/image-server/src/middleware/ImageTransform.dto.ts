import {IsIn, IsInt, IsOptional, IsString, Max, Min} from 'class-validator'
import {Transform} from 'class-transformer'

const DEFAULT_QUALITY = 80
const MAX_QUALITY = 100

const anyToNumber = (value: unknown) => {
  return value ? Number(value) : value
}

export class ImageTransform {
  @Transform(({value}) => anyToNumber(value))
  @IsInt()
  @Min(1)
  width: number

  @Transform(({value}) => anyToNumber(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number

  @IsOptional()
  @IsIn(['cover', 'contain', 'fill', 'inside', 'outside'])
  @IsString()
  crop?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover'

  @IsOptional()
  @IsString()
  @IsIn([
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'north',
    'south',
    'east',
    'west',
    'northeast',
    'southeast',
    'southwest',
    'northwest',
  ])
  position?: string

  @Transform(({value}) => anyToNumber(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUALITY)
  quality: number = DEFAULT_QUALITY

  @IsIn(['heif', 'jpeg', 'jpg', 'png', 'raw', 'tiff', 'webp'])
  format: 'heif' | 'jpeg' | 'jpg' | 'png' | 'raw' | 'tiff' | 'webp' = 'jpeg'
}
