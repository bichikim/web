import {HUNDRED} from '@winter-love/utils'
import {cva, cx} from 'class-variance-authority'
import {createMemo, Show, splitProps} from 'solid-js'
import {PlayOptions} from 'src/use/instruments'
import {SProgress} from './SProgress'
import {STypeIcon} from './STypeIcon'
import type {Header} from '@tonejs/midi'
import {DragButton, DragButtonBodyProps} from '@winter-love/solid-components'
import {SFlowDisplay} from 'src/components/flow-display'

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
  extends Omit<DragButtonBodyProps, 'id' | 'name' | 'onPlay' | 'onSelect'>,
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

const rootStyle = `:uno:
relative gap-4 p-0 b-0 bg-transparent text-5 flex-shrink-0 h-9 mb-0.3125rem last:mb-0
after:bg-gray-300 after:h-.25 first:after:hidden after:content-[""] after:absolute rd-md
after:top--0.1875rem after:left-0.5rem after:w-[calc(100%-1rem)] cursor-pointer touch-none
focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-black focus-visible:outline-offset--3
`

const indexStyle = cva('', {
  variants: {
    playing: {
      true: 'opacity-0',
    },
  },
})

const aiIconStyle = cva('inline-flex origin-center flex-shrink-0 w-5 h-5', {
  variants: {
    generated: {
      false: 'text-gray-600 animate-blink animate-duration-1s cursor-pointer scale-170 ',
      true: 'text-black select-none scale-100 ',
    },
  },
})

const nameStyle = cva('block line-height-6 pb-.5', {
  defaultVariants: {
    selected: false,
  },
  variants: {
    isPlayable: {
      false: 'text-gray line-through',
      true: 'text-black',
    },
    selected: {
      false: 'truncate',
      true: 'text-nowrap',
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
    'header',
    'dragExecuteSize',
    'dragEndSize',
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

  const isMidi = createMemo(() => innerProps.ext && innerProps.ext === 'midi')

  const isPlayable = createMemo(
    () =>
      innerProps.ext === 'midi' ||
      (innerProps.generated && !innerProps.inGeneratingProgress),
  )

  const showAiIcon = createMemo(
    () => innerProps.ext !== 'midi' && !innerProps.inGeneratingProgress,
  )

  return (
    <DragButton.Provider
      type="button"
      onClick={handleSelect}
      onDoubleClick={handlePlayOrSuspend}
      onLeftExecute={handleDelete}
      preventRight
      dragEndSize={innerProps.dragEndSize}
      dragExecuteSize={innerProps.dragExecuteSize}
    >
      <DragButton.Body
        {...restProps}
        class={cx(rootStyle, restProps.class)}
        title={innerProps.name}
      >
        <DragButton.Aside
          position="left"
          component="span"
          class=":uno: absolute flex left-0 top-0 w-var-drag-x h-full overflow-hidden box-border"
        >
          <span class="mr-1 bg-red rd-1 w-full h-full flex items-center p-1">
            <span class="block w-full h-full i-tabler:trash bg-white" />
          </span>
        </DragButton.Aside>
        <DragButton.Content
          component="span"
          class="absolute flex top-0 left-var-drag-x w-full h-full px-4 gap-2 items-center"
        >
          <Show when={innerProps.playing}>
            <SProgress
              class="block absolute w-full h-full left-0 top-0"
              selected={innerProps.selected}
              progress={progress()}
            />
          </Show>
          <Show when={innerProps.selected}>
            <span class="inline-block absolute bg-blue-400 rd-1 top-0 left-0 w-full h-full opacity-40" />
          </Show>
          <Show when={showPlayingIcon()}>
            <span class="inline-block i-tabler:chevrons-right absolute text-gray-500 left-3" />
          </Show>
          <span class="relative inline-block text-gray b-r-solid b-r-.25 b-r-gray-300 pr-2">
            <span class={indexStyle({playing: showPlayingIcon()})}>
              {(innerProps.index ?? 0) + 1}
            </span>
          </span>

          <span class="relative inline-flex gap-1 flex-grow-1 flex-shrink-1 items-center overflow-hidden">
            <SFlowDisplay
              class={nameStyle({
                isPlayable: Boolean(isPlayable()),
                selected: innerProps.selected,
              })}
              move={innerProps.selected}
              speed={2}
            >
              {innerProps.name}
            </SFlowDisplay>
            <STypeIcon class="flex-shrink-0" name={innerProps.ext} />
          </span>
          <Show when={isMidi()}>
            <span class="w-5 h-5 c-black flex-shrink-0 i-tabler:piano" />
          </Show>
          <Show when={showAiIcon()}>
            <span class={aiIconStyle({generated: Boolean(innerProps.generated)})}>
              <span class="inline-block i-hugeicons:artificial-intelligence-04" />
            </span>
          </Show>
          <Show when={innerProps.inGeneratingProgress}>
            <span class="scale-140 inline-flex origin-center flex-shrink-0">
              <span
                class={cx('inline-block i-tabler:loader-2 c-black', 'animate-spin')}
              />
            </span>
          </Show>
          {innerProps.children}
        </DragButton.Content>
      </DragButton.Body>
    </DragButton.Provider>
  )
}
