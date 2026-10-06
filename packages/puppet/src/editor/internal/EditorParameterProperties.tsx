import type {PuppetParameterBinding} from '../../player/document'
import {getBindingInfluence} from '../../deformation/influence'
import {createSignal} from 'solid-js'
import type {ParameterEditorResult} from '../use-parameter-editor'
import {getBindingParameters} from './parameter-keyforms'
import {
  EditorPhysicsProperties,
  type EditorPhysicsPropertiesSource,
} from './EditorPhysicsProperties'
import {InfluenceEditor} from './InfluenceEditor'
import {LayerOrderProperties} from './LayerOrderProperties'
import {EditorPropertyGroup} from './EditorPropertyGroup'

interface EditorParameterPropertiesProps extends EditorPhysicsPropertiesSource {
  readonly binding: PuppetParameterBinding
  readonly editor: ParameterEditorResult
  readonly selectedPartIds: ReadonlyArray<string>
}

const WHOLE_PERCENT = 100

export const EditorParameterProperties = (props: EditorParameterPropertiesProps) => {
  const [influenceExpanded, setInfluenceExpanded] = createSignal(false)
  const names = () =>
    getBindingParameters(props.document, props.binding)
      .map((parameter) => parameter.name)
      .join(' / ')
  const influenceSummary = () => {
    const count = props.binding.influences?.length ?? 0
    const weight = getBindingInfluence({
      binding: props.binding,
      document: props.document,
      parameterValues: props.editor.parameterValueMap(),
    })
    return `${count === 0 ? '기준 없음' : `기준 ${count}개`} · 현재 적용량 ${Number((weight * WHOLE_PERCENT).toFixed(1))}%`
  }

  return (
    <section aria-label="파라미터 속성">
      <EditorPropertyGroup class="parameter-inspector" title="파라미터">
        <p class="parameter-binding-name">{names()}</p>
        <EditorPropertyGroup class="parameter-properties" title="영향도">
          <p class="parameter-section-summary">{influenceSummary()}</p>
          <InfluenceEditor
            title={`${names()} · 영향도 설정`}
            triggerLabel="적용량 기준 편집"
            expanded={influenceExpanded()}
            onExpandedChange={setInfluenceExpanded}
            influences={props.binding.influences}
            parameters={props.document.parameters ?? []}
            parameterValues={props.editor.parameterValueMap()}
            onChange={props.editor.setInfluences}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
          />
        </EditorPropertyGroup>
        <LayerOrderProperties
          document={props.document}
          onDocumentChange={props.onDocumentChange}
          parameterIds={props.binding.parameterIds}
          parameterValues={props.editor.parameterValueMap()}
          selectedPartIds={props.selectedPartIds}
        />
        <EditorPhysicsProperties inputParameterIds={props.binding.parameterIds} source={props} />
      </EditorPropertyGroup>
    </section>
  )
}
