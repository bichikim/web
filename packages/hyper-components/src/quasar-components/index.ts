import {
  QBtn,
  QBtnProps,
  QCard,
  QCardProps,
  QDialog,
  QDialogProps,
  QFooter,
  QFooterProps,
  QHeader,
  QHeaderProps,
  QImg,
  QImgProps,
  QInput,
  QInputProps,
  QLayout,
  QLayoutProps,
  QPage,
  QPageContainer,
  QPageContainerProps,
  QPageProps,
  QSkeleton,
  QSkeletonProps,
  QToolbar,
  QToolbarProps,
  QVideo,
  QVideoProps,
} from 'quasar'
import {withCsx} from '../with-csx'

export const HPage = withCsx<QPageProps>(QPage, 'HPage')
export const HLayout = withCsx<QLayoutProps>(QLayout, 'HLayout')
export const HImg = withCsx<QImgProps>(QImg, 'HImg')
export const HPageContainerProps = withCsx<QPageContainerProps>(QPageContainer, 'HPageContainerProps')
export const HBtn = withCsx<QBtnProps>(QBtn, 'HBtn')
export const HInput = withCsx<Partial<QInputProps>>(QInput, 'HInput')
export const HCard = withCsx<QCardProps>(QCard, 'HCard')
export const HToolbar = withCsx<QToolbarProps>(QToolbar, 'HToolbar')
export const HHeader = withCsx<QHeaderProps>(QHeader, 'HHeader')
export const HFooter = withCsx<QFooterProps>(QFooter, 'HFooter')
export const HDialog = withCsx<QDialogProps>(QDialog, 'HDialog')
export const HVideo = withCsx<QVideoProps>(QVideo, 'HVideo')
export const HSkeleton = withCsx<QSkeletonProps>(QSkeleton, 'HSkeleton')
