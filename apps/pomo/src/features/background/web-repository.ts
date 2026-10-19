import {createWebRepository as createRepository} from '@winter-love/wallpaper/web-repository'
import {prepareVideoBackground, removeVideoBackground} from '../video-background'
import type {BackgroundRepository} from './model'

/** Opens the existing Pomo database and connects its video cache. */
export const createWebRepository = (): BackgroundRepository =>
  createRepository({
    databaseName: 'pomo-background',
    onMediaRemoved: removeVideoBackground,
    onVideoAdded: prepareVideoBackground,
  })
