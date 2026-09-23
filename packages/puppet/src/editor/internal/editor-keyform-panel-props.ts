import type {JSX} from 'solid-js'

import type {
  PuppetParameter,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../../player/document'
import type {PuppetParameterValueMap, PuppetParameterValues} from '../../deformation'

export interface EditorKeyformPanelProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly allParametersVisible?: boolean
  readonly bindings: ReadonlyArray<PuppetParameterBinding>
  readonly getBindingSettingsLabel?: (
    binding: PuppetParameterBinding,
    parameters: ReadonlyArray<PuppetParameter>,
  ) => string | undefined
  readonly influence?: number
  readonly onAllParametersVisibleChange?: (visible: boolean) => void
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onInfluencesChange?: (influences: ReadonlyArray<PuppetParameterInfluence>) => boolean
  readonly onKeyformAdd?: () => void
  readonly onKeyformDelete?: () => void
  readonly onKeyformMove?: (
    bindingId: string,
    values: PuppetParameterValues,
    nextValues: PuppetParameterValues,
  ) => void
  readonly onKeyformSelect?: (bindingId: string, values: PuppetParameterValues) => void
  readonly onParameterAdd?: () => void
  readonly onParameterNameChange?: (bindingId: string, parameterId: string, name: string) => void
  readonly onSelectionConnect?: () => void
  readonly onSelectionDisconnect?: () => void
  readonly onTwoDimensionalParameterAdd?: () => void
  readonly onValueChange?: (values: PuppetParameterValues) => void
  readonly parameterCreationAvailable?: boolean
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly previewBindingIds?: ReadonlySet<string>
  readonly renderBindingSettings?: (
    binding: PuppetParameterBinding,
    parameters: ReadonlyArray<PuppetParameter>,
  ) => JSX.Element
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly values?: PuppetParameterValues
}
