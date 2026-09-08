import {
  EditorRangeInput,
  EditorSelect,
  EditorButton,
  useEditorPortalMount,
} from '../../design-system'
import {Popover} from '@kobalte/core/popover'
import {Show} from 'solid-js'
import {InfluencePresets} from './InfluencePresets'
import {InfluenceGraph} from './InfluenceGraph'
import {InfluencePoints} from './InfluencePoints'
import {type InfluenceRelationProps, useInfluenceSettings} from './use-influence-settings'

const WHOLE_PERCENT = 100

export const InfluenceRelation = (props: InfluenceRelationProps) => {
  const settings = useInfluenceSettings(props)
  const mount = useEditorPortalMount()
  return (
    <div class="influence-inline-row">
      <div class="influence-source">
        <span>기준</span>
        <EditorSelect
          label={`기준 파라미터 ${props.index + 1}`}
          options={props.draft.sources(props.index).map((parameter) => parameter.id)}
          optionLabel={(id) =>
            props.draft.sources(props.index).find((parameter) => parameter.id === id)?.name ?? id
          }
          value={settings.relation().parameterId}
          onChange={settings.changeSource}
        />
      </div>
      <InfluencePresets compact value={settings.direction()} onChange={settings.changeDirection} />
      <Popover
        placement="top-start"
        onOpenChange={(open) => {
          if (open) {
            settings.startEdit()
          } else {
            props.draft.reset()
            settings.endEdit()
          }
        }}
      >
        <Popover.Trigger
          class="editor-button"
          data-selected={settings.direction() === 'custom' || undefined}
          aria-label={`직접 설정 ${props.index + 1}`}
        >
          직접 설정 <span aria-hidden="true" class="puppet-icon puppet-icon-chevron-down" />
        </Popover.Trigger>
        <Popover.Portal mount={mount}>
          <Popover.Content class="influence-popover">
            <header>
              <Popover.Title>커스텀 곡선</Popover.Title>
              <Popover.CloseButton as={EditorButton} aria-label="커스텀 곡선 닫기">
                닫기
              </Popover.CloseButton>
            </header>
            <Show when={props.draft.error() === null}>
              <Show when={props.draft.parameter(props.index)}>
                {(parameter) => (
                  <InfluenceGraph
                    parameter={parameter()}
                    relation={settings.relation()}
                    value={props.parameterValues?.[parameter().id]}
                  />
                )}
              </Show>
            </Show>
            <InfluencePoints {...props} settings={settings} />
            <p role="status">
              {props.draft.error() ?? '변경은 바로 반영됩니다. 되돌리기는 undo를 사용하세요.'}
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <Show when={settings.direction() !== 'custom'} fallback={<span>사용자 곡선</span>}>
        <label>
          최대 {Number((settings.maximum() * WHOLE_PERCENT).toFixed(1))}%
          <EditorRangeInput
            min="0"
            max="100"
            step="1"
            aria-label={`최대 적용량 ${props.index + 1}`}
            value={settings.maximum() * WHOLE_PERCENT}
            onPointerDown={(event) => {
              settings.startEdit()
              event.currentTarget.setPointerCapture?.(event.pointerId)
            }}
            onPointerUp={settings.endEdit}
            onPointerCancel={settings.endEdit}
            onLostPointerCapture={settings.endEdit}
            onBlur={settings.endEdit}
            onKeyDown={(event) => {
              if (
                [
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                  'PageUp',
                  'PageDown',
                ].includes(event.key)
              ) {
                settings.startEdit()
              }
            }}
            onKeyUp={settings.endEdit}
            onInput={(event) => settings.changeMaximum(event.currentTarget.valueAsNumber)}
          />
        </label>
      </Show>
      <EditorButton
        aria-label={`기준 ${props.index + 1} 삭제`}
        onClick={() => props.draft.removeRelation(props.index)}
      >
        삭제
      </EditorButton>
    </div>
  )
}
