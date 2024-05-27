import {addons} from '@storybook/manager-api'
import {camelCase} from 'lodash'

const pascalCase = (value: string) => {
  const [first, ...rest] = camelCase(value)
  return [first.toUpperCase(),...rest].join('')
}

addons.setConfig({
  sidebar: {
    renderLabel: ({ name, type }) => {
      if (type === 'root' || type === 'group') {
        return pascalCase(name)
      }
      return name
    },
  },
})
