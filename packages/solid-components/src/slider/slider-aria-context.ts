import {Accessor, createContext, useContext} from 'solid-js'

export interface SliderAriaContextValue {
  labelledby?: string
  valuemax: string
  valuemin: string
  valuenow: string
  valuetext?: string
}

export const SliderAriaContext = createContext<Accessor<SliderAriaContextValue>>(() => ({
  labelledby: '',
  valuemax: '',
  valuemin: '',
  valuenow: '',
  valuetext: '',
}))

export const useSliderAriaContext = () => {
  const context = useContext(SliderAriaContext)

  if (context === undefined) {
    throw new Error('useSliderAriaContext must be used within a SliderAria')
  }

  return context
}
