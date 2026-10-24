import type {Accessor, Setter} from 'solid-js'
import type {PuppetParameterValueMap, PuppetParameterValues} from '../../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../../../player/document'
import type {CornerKeyformSettings} from '../generate-corner-keyforms'
import type {MirrorKeyformSettings} from '../mirror-keyform'

export interface UseParameterEditorProps {
  /** Requests a card selection; omitted to activate it immediately. */
  readonly onSelectionRequest?: (bindingId: string) => void
  /** Reports synchronous activation by value/keyform editing; omitted for standalone operation. */
  readonly onBindingActivate?: (bindingId: string) => void
  /** Immediate card highlight; omitted to follow the active editing binding. */
  readonly selectedBindingId?: Accessor<string | null>
  readonly document: Accessor<PuppetDocument>
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: Setter<string | null>
  readonly selectedNodeIds: Accessor<ReadonlyArray<string>>
}

export interface ParameterEditorResult {
  /** Optional immediate card selection, separate from the prepared editing target. */
  readonly selectedBindingId?: Accessor<string | null>
  /** Requests card activation; consumers without this capability use selectBinding. */
  readonly requestBinding?: (bindingId: string) => void
  readonly mirrorKeyform: (settings: MirrorKeyformSettings) => string | null
  readonly generateCorners: (settings: CornerKeyformSettings) => string | null
  readonly previewDocument: Accessor<PuppetDocument>
  readonly previewInfluences: (influences: ReadonlyArray<PuppetParameterInfluence> | null) => void
  readonly influence: Accessor<number>
  readonly setInfluences: (influences: ReadonlyArray<PuppetParameterInfluence>) => boolean
  readonly activeBinding: Accessor<PuppetParameterBinding | undefined>
  readonly activeBindingId: Accessor<string | null>
  readonly activeKeyformValues: Accessor<PuppetParameterValues | null>
  readonly activeTargetNodeIds: Accessor<ReadonlyArray<string>>
  readonly allParametersVisible: Accessor<boolean>
  readonly addKeyform: () => void
  readonly addParameter: () => void
  readonly addThreeDimensionalParameter: () => void
  readonly addTwoDimensionalParameter: () => void
  readonly connectSelection: () => void
  readonly deleteKeyform: () => void
  /** Deletes the active 3D binding's plane at third value `value`. */
  readonly deleteKeyformPlane: (value: number) => void
  readonly deleteParameter: (bindingId: string) => void
  readonly disconnectSelection: () => void
  readonly moveKeyform: (values: PuppetParameterValues, nextValues: PuppetParameterValues) => void
  readonly parameterValues: Accessor<PuppetParameterValues>
  readonly parameterValueMap: Accessor<PuppetParameterValueMap>
  readonly renameParameter: (parameterId: string, name: string) => void
  readonly reset: (document: PuppetDocument) => void
  readonly selectBinding: (bindingId: string) => void
  readonly selectKeyform: (values: PuppetParameterValues) => void
  readonly setAllParametersVisible: Setter<boolean>
  readonly setParameterValues: (values: PuppetParameterValues) => void
}
