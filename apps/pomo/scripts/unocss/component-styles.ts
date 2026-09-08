import {imageStudioStyles} from './image-studio'
import {pStudioStyles} from './p-studio'
import {pictureDiaryStyles} from './picture-diary'
import {tourStyles} from './tour'

export const pomoComponentStylePreflight = {
  getCSS: () => [imageStudioStyles, pictureDiaryStyles, pStudioStyles, tourStyles].join('\n'),
}
