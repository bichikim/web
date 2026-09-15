import {cx} from 'class-variance-authority'
import type {PSceneStyle} from '../../features/focus-room-animation/index'

export const CLASSES = {
  dialogueBubble: cx(
    'pomo-dialogue-bubble w-full min-h-0 max-h-full box-border overflow-hidden p-4',
    'text-foreground',
    'shadow-[inset_0_0.0625rem_0_rgb(255_255_255_/_8%)] backdrop-blur-[0.75rem]',
    '[-webkit-backdrop-filter:blur(0.75rem)] [&_p]:min-h-0 [&_p]:overflow-y-auto [&_p]:m-0',
    '[&_p]:pr-1 [&_p]:text-[clamp(0.9rem,_2.5vw,_1rem)]',
    '[&_p]:leading-[1.65] [&_p]:[overscroll-behavior:contain]',
    '[&_p]:[scrollbar-color:rgb(255_250_241_/_24%)_transparent] [&_p]:[scrollbar-width:thin]',
  ),
  dialogueBubbleActions: 'inline-flex items-center gap-1',
  dialogueBubbleHeader: 'flex items-center justify-between gap-3',
  dialogueBubbleMessage: cx('grid grid-rows-[auto_minmax(0,_1fr)]', 'gap-y-2'),
  dialogueBubbleMood: 'block w-9 h-9 flex-none scale-[1.5556] object-contain',
  dialogueBubblePlay: cx(
    'flex cursor-pointer items-center gap-3',
    '[font:inherit] text-left [&_>_span:last-child]:grid',
    '[&_>_span:last-child]:gap-1 [&_strong]:text-lg',
    '[&_small]:text-muted-foreground [&_small]:text-sm [&_small]:leading-[1.5]',
  ),
  dialogueBubblePlayIcon: cx(
    'grid w-9 h-9 flex-none place-items-center rounded-full',
    'bg-secondary-soft text-highlight',
  ),
  dialogueBubbleProgress: cx('inline-flex flex-wrap items-center', 'gap-1'),
  dialogueBubbleProgressDot: cx(
    'w-1.5 h-1.5 box-border flex-none',
    'border border-solid border-border-hover rounded-full bg-transparent',
    '[&[data-complete]]:border-highlight [&[data-complete]]:bg-highlight',
  ),
  dialogueBubbleSkip: 'flex-none whitespace-nowrap',
  dialogueBubbleSpeakerGroup: cx('inline-flex min-w-0 items-center', 'gap-3.5'),
  dialogueBubbleStop: 'flex-none whitespace-nowrap',
} as const

export const getDialogueBubbleShapeClasses = (sceneStyle?: PSceneStyle) =>
  sceneStyle === 'scribble' ? 'rounded-none border-0' : 'rounded-2xl border border-solid'
