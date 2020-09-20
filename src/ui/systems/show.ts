import {ResponsiveValue, system} from 'styled-system'

export interface ShowProps {
  show?: ResponsiveValue<boolean>
}

export const show = () => {
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
