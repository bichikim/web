/* eslint-disable id-length */
import {RequestHandler} from 'express'
import {imageContext} from './image-request'
import sharp from 'sharp'
import {validate} from 'class-validator'
import {ImageTransform} from './ImageTransform.dto'
import {plainToInstance} from 'class-transformer'
import {createProvideContext} from '../utils/context'
import {formatContext} from './image-format'

export interface ImageTransformContext {
  format: string
  image: Buffer
}

export const imageTransformContext = createProvideContext<ImageTransformContext>()

// export const useImageTransform = imageTransformContext.use

export interface ImageTransformOptions {
  maxSize?: number
}

interface Size {
  height: number
  width: number
}

const MAX_SIZE = 2000

const getCropSize = (width: number, maxSize: number, height?: number): Size => {
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

const clampSize = (width: number | undefined, height: number | undefined, maxSize: number): Size => {
  const hasWidth = typeof width === 'number' && Number.isFinite(width)
  const hasHeight = typeof height === 'number' && Number.isFinite(height)

  if (!hasWidth && !hasHeight) {
    return {height: 0, width: 0}
  }

  if (!hasWidth) {
    const nextHeight = Math.min(height as number, maxSize)

    return {height: nextHeight, width: 0}
  }

  if (!hasHeight) {
    const nextWidth = Math.min(width as number, maxSize)

    return {height: 0, width: nextWidth}
  }

  const scale = Math.min(maxSize / (width as number), maxSize / (height as number), 1)

  return {
    height: Math.round((height as number) * scale),
    width: Math.round((width as number) * scale),
  }
}

export const imageTransform = (options: ImageTransformOptions = {}): RequestHandler => {
  const {maxSize = MAX_SIZE} = options

  return async (req, res, next) => {
    const {query} = req
    const {w, h, c, q} = query

    const formatReqContext = formatContext.use(req)

    const options = plainToInstance(ImageTransform, {
      crop: query.crop ?? c,
      format: formatReqContext,
      height: query.height ?? h,
      quality: query.quality ?? q,
      width: query.width ?? w,
    })

    const validationErrors = await validate(options)

    if (validationErrors.length > 0) {
      res.status(400).json({
        errors: validationErrors,
        message: 'Invalid image transform parameters',
      })

      return
    }
    const {height, width, crop, position, quality, format} = options

    const image = imageContext.use(req)

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
      const clamped = clampSize(width, height, maxSize)
      const clampedWidth = clamped.width > 0 ? clamped.width : undefined
      const clampedHeight = clamped.height > 0 ? clamped.height : undefined

      transformer.resize(clampedWidth, clampedHeight, {
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
