import {ParentProps, useContext, ValidComponent} from 'solid-js'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {CheckboxContext} from './context'

export type CheckboxBodyProps<T extends ValidComponent> = DynamicProps<T> & ParentProps

export const CheckboxBody = <T extends ValidComponent>(props: CheckboxBodyProps<T>) => {
  const [checkboxContext, {handleToggleChecked}] = useContext(CheckboxContext)

  return (
    <Dynamic
      {...props}
      aria-checked={checkboxContext().checked}
      aria-required={checkboxContext().required}
      onClick={handleToggleChecked}
      data-checked={checkboxContext().checked}
      data-disabled={checkboxContext().disabled}
      disabled={checkboxContext().disabled}
      id={checkboxContext().id}
    />
  )
}
