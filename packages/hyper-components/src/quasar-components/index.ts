import {
  QAvatar,
  QAvatarProps,
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
  QInnerLoading,
  QInnerLoadingProps,
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
  QTooltip,
  QTooltipProps,
  QVideo,
  QVideoProps,
} from 'quasar'
import {withCsx} from '../with-csx'

export const HPage = withCsx<QPageProps>(QPage, 'HPage', '.q-page')
export const HAvatar = withCsx<QAvatarProps>(QAvatar, 'HAvatar', '.q-avatar')
export const HInnerLoading = withCsx<QInnerLoadingProps>(
  QInnerLoading,
  'HInnerLoading',
  '.q-inner-loading',
)
export const HTooltip = withCsx<QTooltipProps>(QTooltip, 'HTooltip', '.q-tooltip')
export const HLayout = withCsx<QLayoutProps>(QLayout, 'HLayout', '.q-layout')
export const HImg = withCsx<QImgProps>(QImg, 'HImg', '.q-img')
export const HPageContainer = withCsx<QPageContainerProps>(
  QPageContainer,
  'HPageContainerProps',
  '.q-page-container-props',
)
export const HBtn = withCsx<QBtnProps>(QBtn, 'HBtn', '.q-btn')
export const HInput = withCsx<Partial<QInputProps>>(QInput, 'HInput', '.q-input')
export const HCard = withCsx<QCardProps>(QCard, 'HCard', '.q-card')
export const HToolbar = withCsx<QToolbarProps>(QToolbar, 'HToolbar', '.q-toolbar')
export const HHeader = withCsx<QHeaderProps>(QHeader, 'HHeader', '.q-header')
export const HFooter = withCsx<QFooterProps>(QFooter, 'HFooter', '.q-footer')
export const HDialog = withCsx<QDialogProps>(QDialog, 'HDialog', '.q-dialog')
export const HVideo = withCsx<QVideoProps>(QVideo, 'HVideo', '.q-video')
export const HSkeleton = withCsx<QSkeletonProps>(QSkeleton, 'HSkeleton', '.q-skeleton')
