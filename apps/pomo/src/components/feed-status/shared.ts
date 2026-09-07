import {cx} from 'class-variance-authority'
import {type JSX} from 'solid-js'
import type {PSceneStyle} from '../../features/focus-room-animation/index'

export const CLASSES = {
  feedStatus: cx(
    'pomo-feed-status flex w-[min(36rem,_100%)] box-border items-center gap-3',
    'p-[0.8rem_0.9rem]',
    'text-foreground shadow-[inset_0_0.0625rem_0_rgb(255_255_255_/_8%)] pointer-events-auto',
    'backdrop-blur-[0.75rem] [-webkit-backdrop-filter:blur(0.75rem)]',
    "[&_>_[class*='i-tabler']]:flex-none [&_>_[class*='i-tabler']]:text-highlight",
    "feed-status-compact:[&[data-state='recovery']]:flex-wrap",
  ),
  feedStatusAction: 'pomo-feed-status__action flex-none whitespace-nowrap',
  feedStatusActions: cx(
    'pomo-feed-status__actions flex flex-none gap-[0.35rem]',
    'feed-status-compact:w-full feed-status-compact:[&_button]:flex-1',
  ),
  feedStatusCopy: cx(
    'pomo-feed-status__copy grid min-w-0 flex-1 gap-[0.15rem] [&_strong]:overflow-hidden',
    '[&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:overflow-hidden',
    '[&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_strong]:text-[0.78rem]',
    '[&_small]:text-muted-foreground [&_small]:text-[0.68rem]',
  ),
  feedStatusSpinner: cx(
    'pomo-feed-status__spinner w-4 h-4 box-border flex-none',
    'animate-spin [border:0.125rem_solid_rgb(255_255_255_/_24%)]',
    'border-t-highlight rounded-full motion-reduce:animate-[none]',
  ),
} as const

export interface FeedStatusFrameProps {
  readonly children: JSX.Element
  readonly sceneStyle?: PSceneStyle
}
