import {cva, cx} from 'class-variance-authority'
import {createEffect, createSignal, For, JSX, splitProps} from 'solid-js'
import {MusicInfo, SFileItem} from './SFileItem'

export interface SFileListProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  leftTime?: number
  list: MusicInfo[]
  onSelect?: (id: string) => void
  playingId?: string
  selectedId?: string
}

export const SFileList = (props: SFileListProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [innerProps, restProps] = splitProps(props, [
    'list',
    'onSelect',
    'selectedId',
    'leftTime',
    'playingId',
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

  createEffect(() => {
    const _element = element()
    if (!_element) {
      return
    }
    updateScrollIndicators(_element)
    return [innerProps.list, _element]
  })

  const rootStyle = cva(
    cx(
      'bg-white rd-4px flex flex-col relative',
      'before-i-hugeicons:arrow-down-01 before-absolute before-w-20px before-h-20px before-bottom--1 before-w-full',
      'after-i-hugeicons:arrow-up-01 after-absolute after-w-20px after-h-20px after-top--1 after-w-full',
    ),
    {
      variants: {
        bottom: {
          false: 'before-opacity-20',
          true: '',
        },
        show: {
          false: 'pb-3',
          true: 'before-content-[""] after-content-[""] py-3',
        },
        top: {
          false: 'after-opacity-20',
          true: '',
        },
      },
    },
  )

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

  return (
    <div {...restProps} class={cx(rootStyle(scrollIndicators()), props.class)}>
      <div
        ref={setElement}
        class="h-full w-full overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <For each={innerProps.list}>
          {(item, index) => (
            <SFileItem
              {...item}
              index={index()}
              selected={item.selected || item.id === innerProps.selectedId}
              class="w-full"
              leftTime={innerProps.leftTime}
              playing={item.id === innerProps.playingId}
              onSelect={handelSelect}
            />
          )}
        </For>
      </div>
    </div>
  )
}
