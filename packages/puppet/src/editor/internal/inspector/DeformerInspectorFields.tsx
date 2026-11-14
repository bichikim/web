import {CurveProperties} from '../CurveProperties'
import {GridProperties} from '../GridProperties'
import {Show} from 'solid-js'
import type {PuppetParameterValues} from '../../../deformation'
import {type PuppetDocument, type PuppetSceneDeformerNode} from '../../../player'
import {SpatialDeformerProperties} from '../SpatialDeformerProperties'
import type {TransformProperty} from './types'
import {DeformerTransformProperties} from './DeformerTransformProperties'

export interface DeformerInspectorFieldsProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly document: PuppetDocument
  readonly node: PuppetSceneDeformerNode
  readonly disabled: boolean
  readonly editMode?: 'motion' | 'parameter'
  readonly selectedPoints?: ReadonlyArray<number>
  readonly onChange: (property: TransformProperty, value: number) => void
  readonly onDivisionChange: (axis: 'columns' | 'rows', divisions: number) => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const DeformerInspectorFields = (props: DeformerInspectorFieldsProps) => (
  <Show
    when={props.node.deformerType === 'spatial'}
    fallback={
      <>
        <DeformerTransformProperties
          disabled={props.disabled}
          node={props.node}
          onChange={props.onChange}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
        <CurveProperties
          document={props.document}
          node={props.node}
          disabled={props.disabled}
          selectedPoints={props.selectedPoints}
          onDocumentChange={props.onDocumentChange}
        />
        <GridProperties
          node={props.node}
          resolutionEditingDisabled={props.disabled}
          onDivisionChange={props.onDivisionChange}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
        />
      </>
    }
  >
    <SpatialDeformerProperties {...props} />
  </Show>
)
