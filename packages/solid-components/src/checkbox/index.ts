import {freeze} from '@winter-love/utils'
import {CheckboxBody} from './CheckboxBody'
import {CheckboxIndicator} from './CheckboxIndicator'
import {CheckboxRoot} from './CheckboxRoot'
import {CheckboxToggle} from './CheckboxToggle'
import {LabelContent} from '../label'

export * from './CheckboxBody'
export * from './CheckboxIndicator'
export * from './CheckboxRoot'
export * from './CheckboxToggle'

export const Checkbox = freeze({
  Body: CheckboxBody,
  Indicator: CheckboxIndicator,
  Label: LabelContent,
  Root: CheckboxRoot,
  Toggle: CheckboxToggle,
})
