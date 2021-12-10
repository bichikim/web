import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator'
import {Transform} from 'class-transformer'

const DEFAULT_QUALITY = 80
const anyToNumber = (value) => {
  return value ? Number(value) : value
}

export class ImageTransform {
  @Transform(({value}) => anyToNumber(value))
  @IsInt()
    width: number

  @Transform(({value}) => anyToNumber(value))
  @IsOptional()
  @IsInt()
    height?: number

  @IsOptional()
  @IsIn(['cover', 'contain', 'fill', 'inside', 'outside'])
  @IsString()
    crop?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover'

  @IsOptional()
  @IsInt()
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
    position?: string | number

  @IsOptional()
  @IsInt()
    quality: number = DEFAULT_QUALITY

  @IsIn(['heif', 'jpeg', 'jpg', 'png', 'raw', 'tiff', 'webp'])
    format: any = 'jpeg'
}
