import {HUNDRED} from '@winter-love/utils'
import {cva, cx} from 'class-variance-authority'
import {createMemo, JSX, Show, splitProps} from 'solid-js'
import {PlayOptions} from 'src/use/instruments'
import {HDragExecute} from './HDragExecute'
import {SProgress} from './SProgress'
import {STypeIcon} from './STypeIcon'
import type {Header} from '@tonejs/midi'

export interface MusicInfo extends PlayOptions {
  dragEndSize?: number
  ext?: string
  generated?: boolean
  header?: Header
  /**
   * Currently generating AI MIDI
   */
  inGeneratingProgress?: boolean
  /**
   * Currently suspended
   */
  isSuspend?: boolean
  name: string
  /**
   * Currently playing target
   */
  playing?: boolean
  selected?: boolean
}

export interface SFileItemProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onSelect' | 'id' | 'onPlay'>,
    MusicInfo {
  dragExecuteSize?: number
  index?: number
  onDelete?: (id: string) => void
  onGenerate?: (id: string) => void
  onPlay?: (id: string) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onSuspend?: () => void
  playedTime?: number
}

const rootStyle = cx(
  'gap-4 p-0 b-0 bg-transparent text-5 flex-shrink-0 h-9 mb-0.3125rem last:mb-0',
  'after:bg-gray-300 after:h-.25 first:after:hidden after:content-[""] after:absolute',
  'after:top--0.1875rem after:left-0.5rem after:w-[calc(100%-1rem)] cursor-pointer touch-none',
)

const indexStyle = cva('', {
  variants: {
    playing: {
      true: 'opacity-0',
    },
  },
})

const aiIconStyle = cva('flex origin-center flex-shrink-0', {
  variants: {
    generated: {
      false: 'text-gray-600 animate-blink animate-duration-1s cursor-pointer scale-170 ',
      true: 'text-black select-none scale-140 ',
    },
  },
})

const nameStyle = cva('block line-height-6 truncate pb-.5', {
  compoundVariants: [
    {
      class: 'text-gray line-through',
      ext: true,
      inProgress: true,
    },
  ],
  variants: {
    ext: {
      false: 'text-gray line-through',
      true: '',
    },
    inProgress: {
      false: 'text-black',
    },
  },
})

export const SFileItem = (props: SFileItemProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'children',
    'index',
    'name',
    'onSelect',
    'id',
    'midi',
    'inGeneratingProgress',
    'isSuspend',
    'selected',
    'generated',
    'ext',
    'playedTime',
    'playing',
    'totalDuration',
    'onDelete',
    'onPlay',
    'onResume',
    'onSuspend',
  ])

  const handleSelect = () => {
    innerProps.onSelect?.(innerProps.id)
  }

  const progress = createMemo(
    () => ((innerProps.playedTime ?? 0) / (innerProps.totalDuration ?? 1)) * HUNDRED,
  )

  const handleDelete = () => {
    innerProps.onDelete?.(innerProps.id)
  }

  const handlePlayOrSuspend = () => {
    if (innerProps.isSuspend && innerProps.playing) {
      innerProps.onResume?.()
    } else if (innerProps.playing) {
      innerProps.onSuspend?.()
    } else {
      innerProps.onPlay?.(innerProps.id)
    }
  }

  const showPlayingIcon = createMemo(
    () => innerProps.playing && (innerProps.playedTime ?? 0) < innerProps.totalDuration,
  )

  return (
    <HDragExecute
      {...restProps}
      title={innerProps.name}
      class={cx(rootStyle, restProps.class)}
      containerClass="px-4 gap-2"
      onClick={handleSelect}
      onDoubleClick={handlePlayOrSuspend}
      onLeftExecute={handleDelete}
      dragLeftChildren={
        <span class="block w-[calc(100%-0.25rem)] h-full overflow-hidden bg-red p-1 box-border rd-1">
          <span class="block w-full h-full i-tabler:trash bg-white " />
        </span>
      }
    >
      <Show when={innerProps.playing}>
        <SProgress
          class="block absolute w-full h-full left-0 top-0"
          selected={innerProps.selected}
          progress={progress()}
        />
      </Show>
      <Show when={innerProps.selected}>
        <span class="block absolute bg-blue rd-1 top-0 left-0 w-full h-full opacity-40" />
      </Show>
      <Show when={showPlayingIcon()}>
        <span class="block i-tabler:chevrons-right absolute text-gray-500 left-3" />
      </Show>
      <span class="relative block text-gray b-r-solid b-r-.25 b-r-gray-300 pr-2">
        <span class={indexStyle({playing: showPlayingIcon()})}>
          {(innerProps.index ?? 0) + 1}
        </span>
      </span>

      <span class="relative flex gap-1 flex-grow-1 flex-shrink-1 items-center overflow-hidden">
        <span
          class={nameStyle({
            ext: Boolean(innerProps.ext),
            inProgress: Boolean(innerProps.inGeneratingProgress),
          })}
        >
          {innerProps.name}
        </span>
        <STypeIcon name={innerProps.ext} />
      </span>
      <Show
        when={innerProps.inGeneratingProgress}
        fallback={<span class="w-5 h-5 c-black flex-shrink-0 i-tabler:piano" />}
      >
        <span class="scale-140 inline-flex origin-center flex-shrink-0">
          <span class={cx('inline-block i-tabler:loader-2 c-black', 'animate-spin')} />
        </span>
      </Show>
      <Show
        when={
          innerProps.ext && innerProps.ext !== 'midi' && !innerProps.inGeneratingProgress
        }
      >
        <span class={aiIconStyle({generated: Boolean(innerProps.generated)})}>
          <span class="inline-block i-hugeicons:artificial-intelligence-04" />
        </span>
      </Show>
      {innerProps.children}
    </HDragExecute>
  )
}
