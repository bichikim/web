import {createEffect, JSX, Show, splitProps} from 'solid-js'
import {cva, cx} from 'class-variance-authority'
import {STypeIcon} from './STypeIcon'
import {SampleStart} from './types'

export interface MusicInfo {
  ext?: string
  generated?: boolean
  id: string
  inProgress?: boolean
  midi?: SampleStart[][]
  name: string
  selected?: boolean
}

export interface SFileItemProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onSelect' | 'id'>,
    MusicInfo {
  index?: number
  onGenerate?: (id: string) => void
  onSelect?: (id: string) => void
}
export const SFileItem = (props: SFileItemProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'children',
    'index',
    'name',
    'onSelect',
    'id',
    'midi',
    'inProgress',
    'selected',
    'generated',
    'ext',
  ])

  const nameStyle = cva('block line-height-20px truncate pt-2px', {
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

  const aiIconStyle = cva('flex origin-center flex-shrink-0', {
    variants: {
      generated: {
        false:
          'text-gray-600 animate-blink animate-duration-1s cursor-pointer scale-170 ',
        true: 'text-black select-none scale-140 ',
      },
    },
  })

  const rootStyle = cva(
    cx(
      'flex gap-4 items-center b-0 bg-transparent text-20px flex-shrink-0 h-36px',
      'b-t-1px b-t-gray-300 b-t-solid first:b-t-0 px-4 relative',
    ),
    {
      variants: {
        selected: {
          false: '',
          true: cx(
            'before-content-[""] before-absolute before-bg-blue before-opacity-30 before-rd-6px',
            'before-left-0 before-top-0 before-bottom-0 before-right-0',
          ),
        },
      },
    },
  )

  const handleSelect = () => {
    props.onSelect?.(props.id)
  }

  createEffect(() => {
    console.log(innerProps.selected)
  })

  return (
    <button
      {...restProps}
      class={cx(rootStyle({selected: Boolean(innerProps.selected)}), restProps.class)}
      onClick={handleSelect}
    >
      <span class="relative block text-gray b-r-solid b-r-1px b-r-gray-300 pr-2">
        {innerProps.index}
      </span>
      <span class="relative flex gap-1 flex-grow-1 flex-shrink-1 items-center overflow-hidden">
        <span
          class={nameStyle({
            ext: Boolean(innerProps.ext),
            inProgress: Boolean(innerProps.inProgress),
          })}
        >
          {innerProps.name}
        </span>
        <STypeIcon name={props.ext} />
      </span>
      <Show
        when={innerProps.inProgress}
        fallback={<span class="w-20px h-20px flex-shrink-0" />}
      >
        <span class="scale-140 inline-flex origin-center flex-shrink-0">
          <span
            class={cx('inline-block i-hugeicons:loading-02 text-black', 'animate-spin')}
          />
        </span>
      </Show>
      <Show when={innerProps.ext && innerProps.ext !== 'midi' && !innerProps.inProgress}>
        <span class={aiIconStyle({generated: Boolean(innerProps.generated)})}>
          <span class="inline-block i-hugeicons:artificial-intelligence-04" />
        </span>
      </Show>
      {innerProps.children}
    </button>
  )
}
