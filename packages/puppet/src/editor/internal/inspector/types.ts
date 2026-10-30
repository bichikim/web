import {type JSX} from 'solid-js'
import type {PuppetParameterValues} from '../../../deformation'
import {type PuppetDocument} from '../../../player'

export interface EditorInspectorProps {
  /** Prevents editing the previous target during selection preparation; omitted to keep editing enabled. */
  readonly selectionPending?: boolean
  readonly editingDisabled?: boolean
  readonly children?: JSX.Element
  readonly parameterProperties?: JSX.Element
  readonly history?: JSX.Element
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly autoMeshAvailable?: boolean
  readonly containerUnwrapAvailable?: boolean
  readonly notice?: string | null
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly maskPickSourcePartId?: string
  readonly onAutoMesh?: () => void
  readonly onContainerUnwrap?: () => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onMaskPickCancel?: () => void
  readonly onMaskPickStart?: (partId: string) => void
  readonly previewDocument?: PuppetDocument
  readonly selectedControlPointIndices?: ReadonlyArray<number>
  readonly targetNodeIds?: ReadonlyArray<string>
}

export type TransformProperty = 'angle' | 'rotationOriginX' | 'rotationOriginY'
