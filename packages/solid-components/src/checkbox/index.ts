import {freeze} from '@winter-love/utils'
import {CheckboxBody} from './CheckboxBody'
import {CheckboxIndicator} from './CheckboxIndicator'
import {CheckboxProvider} from './CheckboxProvider'
import {CheckboxToggle} from './CheckboxToggle'
import {LabelContent} from '../label'

export * from './CheckboxBody'
export * from './CheckboxIndicator'
export * from './CheckboxProvider'
export * from './CheckboxToggle'

export const Checkbox = freeze({
  Body: CheckboxBody,
  Indicator: CheckboxIndicator,
  Label: LabelContent,
  Provider: CheckboxProvider,
  Toggle: CheckboxToggle,
})
