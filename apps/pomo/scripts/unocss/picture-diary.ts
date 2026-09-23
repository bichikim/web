import {pictureDiaryDrawingStyles} from './picture-diary-drawing'
import {pictureDiaryLayoutStyles} from './picture-diary-layout'
import {pictureDiaryNavigationStyles} from './picture-diary-navigation'
import {pictureDiaryPagesStyles} from './picture-diary-pages'
import {pictureDiaryTurnsStyles} from './picture-diary-turns'

export const pictureDiaryStyles = [
  pictureDiaryLayoutStyles,
  pictureDiaryPagesStyles,
  pictureDiaryNavigationStyles,
  pictureDiaryTurnsStyles,
  pictureDiaryDrawingStyles,
].join('\n')
