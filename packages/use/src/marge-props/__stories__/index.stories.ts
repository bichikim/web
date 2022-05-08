import {margeProps} from '../'

export const Default = () => ({
  setup() {
    const result = margeProps(
      {
        bar: {default: 'foo', type: String},
      },
      ['foo', 'john'],
    )
    return {result}
  },
  template: '<div>{{result}}</div>',
})
