import {Accessor, createContext} from 'solid-js'

export interface CheckboxContextProps {
  checked: boolean
  disabled: boolean
  id: string
  required: boolean
}

export interface CheckboxContextActions {
  handleToggleChecked: () => void
}

export const CheckboxContext = createContext<[Accessor<CheckboxContextProps>, CheckboxContextActions]>([
  () => ({
    checked: false,
    disabled: false,
    id: '',
    required: false,
  }),
  {
    handleToggleChecked: (): void => {
      throw new Error('not implemented')
    },
  },
])
