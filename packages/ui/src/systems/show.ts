import {ResponsiveValue, styleFn, system} from 'styled-system'

export interface ShowProps {
  show?: ResponsiveValue<boolean>
}

export const show = (): styleFn => {
  return system({
    show: {
      property: 'display',
      transform: (value) => {
        if (value === false) {
          return 'none'
        }
      },
    },
  })
}
