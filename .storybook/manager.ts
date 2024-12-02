import {addons} from '@storybook/manager-api'
import {words} from 'lodash'

const pascalCase = (value: string) => {
  return words(value)
    .map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
    .join('')
}

addons.setConfig({
  sidebar: {
    renderLabel: ({name, type}) => {
      if (type === 'root' || type === 'group') {
        return pascalCase(name)
      }
      return name
    },
  },
})
