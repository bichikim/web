import {cva, cx} from 'class-variance-authority'
import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  JSX,
  Show,
  splitProps,
} from 'solid-js'
import {MusicInfo, SFileItem} from './SFileItem'
import {useMidiFileInput} from './midi-file-input'

export interface SFileListProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onPlay'> {
  /**
   * Currently suspended
   */
  isSuspend?: boolean
  list: MusicInfo[]
  onAdd?: (value: MusicInfo[]) => void
  onDelete?: (id: string) => void
  onPlay?: (id: string) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onSuspend?: () => void
  playedTime?: number
  playingId?: string
  selectedId?: string
}

const rootBaseStyle = `:uno:
flex flex-col relative
before-i-tabler:chevron-down before-absolute before-w-5 before-h-5 before-bottom--1 before-w-full rd-1
after-i-tabler:chevron-up after-absolute after-w-5 after-h-5 after-top--1 after-w-full b-2 b-dashed
`

const rootStyle = cva(rootBaseStyle, {
  defaultVariants: {
    bottom: false,
    isDragOver: false,
    show: false,
    top: false,
  },
  variants: {
    bottom: {
      false: 'before-opacity-20',
      true: '',
    },
    isDragOver: {
      false: 'b-transparent',
      true: 'b-gray',
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
})

const labelStyle = `:uno:
absolute top-0 left-0 w-full h-full text-center flex items-center justify-center text-gray-400 text-3rem
`

const fileListStyle = cva(':uno: h-full w-full overflow-y-auto overflow-x-hidden', {
  variants: {
    isDragOver: {
      false: 'visible',
      true: 'invisible',
    },
  },
})

export const SFileList = (props: SFileListProps) => {
  const id = createUniqueId()
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | null>(null)

  const {handleInputFiles, handleDragOver, handleDragLeave, handleDrop, isDragOver} =
    useMidiFileInput(inputElement, {
      onAdd: props.onAdd,
    })

  const [innerProps, restProps] = splitProps(props, [
    'list',
    'onSelect',
    'selectedId',
    'playedTime',
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

  const handleClickInput = (event: MouseEvent) => {
    event.preventDefault()
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
    <div
      {...restProps}
      onDragOver={handleDragOver}
      class={rootStyle({
        ...scrollIndicators(),
        class: props.class,
        isDragOver: isDragOver(),
      })}
    >
      <Show when={isDragOver()}>
        <label for={id} class={labelStyle}>
          Drop Here
        </label>
        <input
          type="file"
          ref={setInputElement}
          class="absolute opacity-0 w-full h-full"
          tabIndex="-1"
          id={id}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
          onClick={handleClickInput}
          onChange={async (event) => {
            await handleInputFiles(event.target.files)
            ;(event.target.value as any) = null
          }}
        />
      </Show>
      <section
        role="list"
        ref={setElement}
        class={fileListStyle({isDragOver: isDragOver()})}
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
              playedTime={innerProps.playedTime}
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
