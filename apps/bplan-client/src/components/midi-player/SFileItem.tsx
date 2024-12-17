import {Midi} from '@tonejs/midi'
import {JSX, Show, splitProps} from 'solid-js'
import {cva, cx} from 'class-variance-authority'
import {STypeIcon} from './STypeIcon'

export interface MusicInfo {
  ext?: string
  generated?: boolean
  id: string
  inProgress?: boolean
  midi?: Midi
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

  const nameStyle = cva('', {
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

  const aiIconStyle = cva('scale-150 inline-flex origin-center', {
    variants: {
      generated: {
        false: 'text-gray-600 animate-blink animate-duration-1s cursor-pointer',
        true: 'text-black select-none',
      },
    },
  })

  return (
    <button
      {...restProps}
      class={cx(
        'flex gap-4 items-center b-0 bg-transparent text-20px flex-shrink-0 h-36px',
        'b-t-1px b-t-gray-300 b-t-solid first:b-t-0 px-4',
      )}
    >
      <span class="text-gray b-r-solid b-r-1px b-r-gray-300 pr-2">
        {innerProps.index}
      </span>
      <span class="inline-flex gap-1 flex-grow-1 items-center">
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
      <Show when={innerProps.inProgress}>
        <span class="scale-150 inline-flex origin-center">
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
