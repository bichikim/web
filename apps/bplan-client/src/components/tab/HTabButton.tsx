import {ComponentProps, splitProps} from 'solid-js'
import {useTabButton} from './tab-button'

export interface HTabButtonProps extends ComponentProps<'button'> {
  value: string
}

export const HTabButton = (props: HTabButtonProps) => {
  const [innerProps, restProps] = splitProps(props, ['value'])
  const {handleSelect, isSelected, id} = useTabButton(() => innerProps.value)

  return (
    <button
      {...restProps}
      data-state={isSelected() ? 'active' : 'inactive'}
      onClick={handleSelect}
      role="tab"
      aria-selected={isSelected() ? 'true' : 'false'}
      aria-controls={id()}
    >
      {props.children}
    </button>
  )
}
