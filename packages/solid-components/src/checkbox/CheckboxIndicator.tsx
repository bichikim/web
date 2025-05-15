import {useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {CheckboxContext} from './context'

export type CheckboxIndicatorProps<T extends ValidComponent> = DynamicProps<T>

/**
 * When an element that adds data-checked and data-disabled attributes is needed as an Indicator
 * @component
 */
export const CheckboxIndicator = <T extends ValidComponent>(props: CheckboxIndicatorProps<T>) => {
  const [checkboxContext] = useContext(CheckboxContext)

  return <Dynamic {...props} data-checked={checkboxContext().checked} data-disabled={checkboxContext().disabled} />
}
