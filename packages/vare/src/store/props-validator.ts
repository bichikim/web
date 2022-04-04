import {ComponentPropsOptions} from 'vue-demi'
export const getTypeName = (value: any) => {
  switch (value) {
    case String:
      return 'string'
    case Number:
      return 'number'
    case Object:
      return 'object'
    case Boolean:
      return 'boolean'
    default:
      return 'any'
  }
}
export const propsValidator = (props: Record<string, any>, propsOptions?: ComponentPropsOptions): boolean | string => {
  if (!propsOptions) {
    return true
  }
  return Object.entries(props).every(([key, value]) => {
    const option = propsOptions[key]
    if (!option) {
      return true
    }
    const {validator, type} = option
    if (typeof validator === 'function') {
      return validator(value)
    }
    if (type) {
      const typeName = getTypeName(type)
      if (typeName === 'any') {
        return true
      }
      return typeof value === typeName
    }
    return true
  })
}
