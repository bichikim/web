import {ComponentProps, createMemo, JSX, ParentProps, Show, splitProps} from 'solid-js'
import {useTabButton} from './tab-button'
import {Dynamic} from 'solid-js/web'

export interface HTabButtonSelfProps extends ComponentProps<'button'> {
  value: string
}

export interface HTabButtonPassArg {
  'aria-controls': string
  'aria-selected': 'true' | 'false'
  'data-state': 'active' | 'inactive'
  isSelected: boolean
  onClick: () => void
  role: 'tab'
}

export interface HTabButtonPassProps {
  children: (arg: HTabButtonPassArg) => JSX.Element
  value: string
}

export type HTabButtonProps = HTabButtonSelfProps | HTabButtonPassProps

export const HTabButton = (props: HTabButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['value'])
  const {handleSelect, isSelected, id} = useTabButton(() => innerProps.value)

  const children = createMemo(() => {
    if (typeof props.children === 'function') {
      return props.children({
        'aria-controls': id(),
        'aria-selected': isSelected() ? 'true' : 'false',
        'data-state': isSelected() ? 'active' : 'inactive',
        isSelected: isSelected(),
        onClick: handleSelect,
        role: 'tab',
      })
    }

    return props.children
  })

  return (
    <Show
      when={typeof props.children === 'function'}
      fallback={
        <button
          {...restProps}
          data-state={isSelected() ? 'active' : 'inactive'}
          onClick={handleSelect}
          role="tab"
          aria-selected={isSelected() ? 'true' : 'false'}
          aria-controls={id()}
        >
          {children()}
        </button>
      }
    >
      {children()}
    </Show>
  )
}
