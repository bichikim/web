import {Plugin, inject} from 'vue'

interface ImageOptions {
  baseUrl?: string
}

export type ImageContext = ImageOptions

export const imageSym = Symbol('image-symbol')

export const useImage = () => {
  return inject(imageSym, {})
}

export const createImageContext = (options: ImageOptions): ImageContext => {
  return {
    ...options,
  }
}

export const createImage = (): Required<Plugin> => {
  return {
    install(app, options: ImageOptions = {}) {
      app.provide(imageSym, createImageContext(options))
    },
  }
}
