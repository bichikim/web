import {EditorCheckbox} from '../../design-system'
import type {PuppetDocument} from '../../player/document'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {KeyedFor} from './KeyedFor'
import {setParameterRepeat} from './parameter-repeat'

export interface ParameterRepeatPropertiesProps {
  readonly document: PuppetDocument
  readonly parameterIds: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

/** Whether each selected parameter wraps around its range (Cubism's repeat). */
export const ParameterRepeatProperties = (props: ParameterRepeatPropertiesProps) => {
  const parameters = () =>
    props.parameterIds.flatMap((id) => {
      const parameter = props.document.parameters?.find((candidate) => candidate.id === id)
      return parameter === undefined ? [] : [parameter]
    })
  return (
    <EditorPropertyGroup class="parameter-properties" title="범위">
      <KeyedFor each={parameters()} key={(parameter) => parameter.id}>
        {(parameter) => (
          <div class="editor-color-row">
            <span data-tooltip="범위를 넘으면 반대쪽 끝으로 이어지고, 최댓값의 키폼 대신 첫 키폼으로 돌아갑니다">
              {parameter().name} 반복
            </span>
            <EditorCheckbox
              checked={parameter().repeat === true}
              disabled={props.onDocumentChange === undefined || parameter().options !== undefined}
              label={`${parameter().name} 반복`}
              onChange={(repeat) => {
                const document = setParameterRepeat(props.document, parameter().id, repeat)
                if (document !== undefined) {
                  props.onDocumentChange?.(document)
                }
              }}
            />
          </div>
        )}
      </KeyedFor>
    </EditorPropertyGroup>
  )
}
