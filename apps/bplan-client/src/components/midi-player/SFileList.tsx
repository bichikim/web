import {cva, cx} from 'class-variance-authority'
import {createEffect, createSignal, For, JSX, splitProps} from 'solid-js'
import {MusicInfo, SFileItem} from './SFileItem'

export interface SFileListProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onPlay'> {
  /**
   * Currently suspended
   */
  isSuspend?: boolean
  leftTime?: number
  list: MusicInfo[]
  onDelete?: (id: string) => void
  onPlay?: (id: string) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onSuspend?: () => void
  playingId?: string
  selectedId?: string
}

const rootStyle = cva(
  cx(
    'flex flex-col relative',
    'before-i-tabler:chevron-down before-absolute before-w-5 before-h-5 before-bottom--1 before-w-full',
    'after-i-tabler:chevron-up after-absolute after-w-5 after-h-5 after-top--1 after-w-full',
  ),
  {
    variants: {
      bottom: {
        false: 'before-opacity-20',
        true: '',
      },
      show: {
        false: '',
        true: 'before-content-[""] after-content-[""] py-3',
      },
      top: {
        false: 'after-opacity-20',
        true: '',
      },
    },
  },
)

export const SFileList = (props: SFileListProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)

  const [innerProps, restProps] = splitProps(props, [
    'list',
    'onSelect',
    'selectedId',
    'leftTime',
    'playingId',
    'onDelete',
    'onPlay',
    'onSuspend',
    'onResume',
    'isSuspend',
  ])

  // indicators
  const [scrollIndicators, setScrollIndicators] = createSignal({
    bottom: false,
    show: false,
    top: false,
  })

  const updateScrollIndicators = (element: HTMLElement) => {
    setScrollIndicators({
      bottom: element.scrollTop < element.scrollHeight - element.clientHeight,
      show: element.scrollHeight > element.clientHeight,
      top: element.scrollTop > 0,
    })
  }

  const handleScroll = () => {
    const _element = element()

    if (!_element) {
      return
    }

    updateScrollIndicators(_element)
  }

  const handelSelect = (id: string) => {
    innerProps?.onSelect?.(id)
  }

  const handleDelete = (id: string) => {
    innerProps?.onDelete?.(id)
  }

  createEffect(() => {
    const _element = element()

    if (!_element) {
      return
    }

    updateScrollIndicators(_element)

    return [innerProps.list, _element]
  })

  return (
    <div {...restProps} class={cx(rootStyle(scrollIndicators()), props.class)}>
      <section
        role="list"
        ref={setElement}
        class="h-full w-full overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <For each={innerProps.list}>
          {(item, index) => (
            <SFileItem
              {...item}
              role="listitem"
              index={index()}
              selected={item.selected || item.id === innerProps.selectedId}
              class="w-full"
              leftTime={innerProps.leftTime}
              isSuspend={innerProps.isSuspend}
              playing={item.id === innerProps.playingId}
              onSelect={handelSelect}
              onDelete={handleDelete}
              onPlay={innerProps.onPlay}
              onResume={innerProps.onResume}
              onSuspend={innerProps.onSuspend}
              dragEndSize={90}
              dragExecuteSize={90}
            />
          )}
        </For>
      </section>
    </div>
  )
}
