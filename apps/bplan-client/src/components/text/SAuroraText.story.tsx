// SAuroraText.story

import {SAuroraText} from './SAuroraText'
import {Meta} from 'storybook-solidjs'

const meta: Meta = {
  argTypes: {
    children: {
      control: 'text',
      defaultValue: 'Aurora Text Effect',
      description: '텍스트 내용',
    },
    textClass: {
      control: 'text',
      defaultValue: ':uno: text-2xl font-bold text-white',
      description: '텍스트에 적용할 클래스',
    },
  },
  args: {
    children: 'Aurora Text Effect',
    class: `:uno: relative p-4 w-auto h-auto overflow-hidden background-clip-text text-2xl font-bold
      var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640 var-aurora-color-4=#e54cff
      `,
  },
  component: SAuroraText,
  title: 'BPlan/Components/Text/SAuroraText',
}

export default meta

export const Default = {
  args: {
    children: 'Aurora Text Effect',
  },
}
