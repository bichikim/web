import type {PuppetParameter, PuppetParameterBinding} from '../../player/document'
import type {PuppetParameterValueMap, PuppetParameterValues} from '../../deformation'
import type {PuppetPoint} from '../../player'
import type {CornerKeyformSettings} from './generate-corner-keyforms'
import type {MirrorKeyformSettings} from './mirror-keyform'

export interface EditorKeyformPanelProps {
  readonly keyformCenter?: PuppetPoint
  readonly onKeyformMirror?: (settings: MirrorKeyformSettings) => string | null
  readonly onCornersGenerate?: (settings: CornerKeyformSettings) => string | null
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly allParametersVisible?: boolean
  readonly bindings: ReadonlyArray<PuppetParameterBinding>
  readonly bindingInfluences?: ReadonlyMap<string, number>
  readonly onAllParametersVisibleChange?: (visible: boolean) => void
  readonly onBindingDelete?: (bindingId: string) => void
  readonly onBindingSelect?: (bindingId: string) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
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
  readonly setBrushControlsMount?: (element: HTMLDivElement | undefined) => void
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
  readonly values?: PuppetParameterValues
}
