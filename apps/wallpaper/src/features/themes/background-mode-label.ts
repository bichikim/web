import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'
import {text} from '../localization'

export const backgroundModeLabel = (mode: WallpaperContent['mode']) => {
  switch (mode) {
    case 'album':
      return text('앨범')
    case 'puppet':
      return 'Poffo'
    case 'website':
      return text('웹사이트')
  }
}
