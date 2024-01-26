import {Ref} from 'vue'

export interface VModelOptions<ValueName extends string, InputName extends string> {
  /**
   * @default 'input'
   */
  inputName?: InputName

  update?: (value: Ref<any>, payload: any) => void

  /**
   * @default 'value'
   */
  valueName?: ValueName
}

export type VModelResult<T, ValueName extends string, InputName extends string> = Record<
  ValueName,
  T
> &
  Record<InputName, (event: any) => any>
export const _vModel = <T, ValueName extends string, InputName extends string>(
  value: Ref<T>,
  options: VModelOptions<ValueName, InputName> = {},
): VModelResult<T, ValueName, InputName> => {
  const {valueName = 'value', inputName = 'onInput', update} = options
  return {
    [inputName]: (event: any) => {
      if (update) {
        update(value, event)
        return
      }
      value.value = event.target?.value
    },
    [valueName]: value.value,
  } as any
}

export interface VModel {
  <T>(value: Ref<T>): <ValueName extends string, InputName extends string>(
    options?: VModelOptions<ValueName, InputName>,
  ) => VModelResult<T, ValueName, InputName>
  <T, ValueName extends string, InputName extends string>(
    value: Ref<T>,
    options: VModelOptions<ValueName, InputName>,
  ): VModelResult<T, ValueName, InputName>
}

export const vModel: VModel = (value, options?): any => {
  if (options) {
    return _vModel(value, options)
  }
  return (options) => {
    return _vModel(value, options)
  }
}

export interface VModelRight {
  <ValueName extends string, InputName extends string>(
    options?: VModelOptions<ValueName, InputName>,
  ): <T>(value: Ref<T>) => VModelResult<T, ValueName, InputName>
  <T, ValueName extends string, InputName extends string>(
    options: VModelOptions<ValueName, InputName>,
    value: Ref<T>,
  ): VModelResult<T, ValueName, InputName>
}
export const vModelRight: VModelRight = (options, value?): any => {
  if (value) {
    return _vModel(value, options)
  }

  return (value) => {
    return _vModel(value, options)
  }
}

export const inputModel = vModelRight({})
export const valueModel = vModelRight({
  inputName: 'onUpdate:modelValue',
  update: (value, event) => {
    value.value = event
  },
  valueName: 'modelValue',
})
