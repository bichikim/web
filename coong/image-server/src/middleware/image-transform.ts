/* eslint-disable id-length,unicorn/consistent-destructuring */
import {RequestHandler} from 'express'
import {useImage} from './image-request'
import sharp from 'sharp'
import {validate} from 'class-validator'
import {ImageTransform} from './ImageTransform.dto'
import {plainToInstance} from 'class-transformer'
import {createProvideContext} from '../utils/context'
import {useFormat} from './image-format'

export interface ImageTransformContext {
  format: string
  image: Buffer
}

const imageTransformContext = createProvideContext<ImageTransformContext>()

export const useImageTransform = imageTransformContext.use

export interface ImageTransformOptions {
  maxSize?: number
}

interface Size {
  height: number
  width: number
}

const MAX_SIZE = 2000

const getCropSize = (
  width: number,
  maxSize: number,
  height?: number,
): Size => {
  const _height = height ?? width
  if (width <= maxSize && _height <= maxSize) {
    return {height: _height, width}
  }

  const aspectRatio = width / _height

  if (width > _height) {
    return {
      height: Math.round(maxSize / aspectRatio),
      width: maxSize,
    }
  }
  return {
    height: maxSize,
    width: Math.round(maxSize * aspectRatio),
  }
}

export const imageTransform = (options: ImageTransformOptions = {}): RequestHandler => {
  const {maxSize = MAX_SIZE} = options

  return async (req, res, next) => {
    const {query} = req
    const {w, h, c, q} = query

    const formatContext = useFormat(req)

    const options = plainToInstance(ImageTransform, {
      crop: query.crop ?? c,
      format: formatContext,
      height: query.height ?? h,
      quality: query.quality ?? q,
      width: query.width ?? w,
    })

    await validate(options)
    const {height, width, crop, position, quality, format} = options

    const image = useImage(req)

    if (!image) {
      return next()
    }

    const transformer = sharp(image).rotate()

    if (crop && width) {
      const size = getCropSize(width, maxSize, height)
      transformer.resize(size.width, size.height, {
        fit: crop,
        position: position,
      })
    } else {
      transformer.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    const transformedImage = await transformer.toFormat(format, {quality}).toBuffer()

    imageTransformContext.provide(req, {
      format,
      image: transformedImage,
    })

    next()
  }
}
