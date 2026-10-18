import type {PuppetParameterValues} from '../../../deformation'
import type {PuppetParameter, PuppetParameterBinding} from '../../../player/document'

export interface EditorKeyformTrackProps {
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  readonly active: boolean
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly binding: PuppetParameterBinding
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onKeyformMove?: (
    bindingId: string,
    values: PuppetParameterValues,
    nextValues: PuppetParameterValues,
  ) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly values?: PuppetParameterValues
}
