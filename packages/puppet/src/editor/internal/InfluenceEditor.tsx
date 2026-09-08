import {Collapsible} from '@kobalte/core/collapsible'
import {EditorButton} from '../../design-system'
import {createEffect, createSignal, Index, type JSX, untrack} from 'solid-js'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetParameter, PuppetParameterInfluence} from '../../player/document'
import {InfluenceRelation} from './InfluenceRelation'
import {useInfluenceDraft} from './use-influence-draft'

interface InfluenceEditorProps {
  readonly renderTrigger?: (trigger: JSX.Element) => JSX.Element
  readonly title?: string
  readonly expanded?: boolean
  readonly onExpandedChange?: (open: boolean) => void
  readonly influences?: ReadonlyArray<PuppetParameterInfluence>
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly parameterValues?: PuppetParameterValueMap
  readonly onChange?: (influences: ReadonlyArray<PuppetParameterInfluence>) => boolean
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}

export const InfluenceEditor = (props: InfluenceEditorProps) => {
  const draft = useInfluenceDraft(props)
  const [localExpanded, setExpanded] = createSignal(true)
  const expanded = () => props.expanded ?? localExpanded()
  createEffect(() => {
    props.influences
    props.parameters
    untrack(draft.reset)
  })
  return (
    <Collapsible
      open={expanded()}
      onOpenChange={(open) => {
        draft.reset()
        setExpanded(open)
        props.onExpandedChange?.(open)
      }}
    >
      {(() => {
        const trigger = (
          <Collapsible.Trigger class="influence-toggle" aria-label={props.title ?? '영향도'}>
            <span>영향도</span>
            <span
              class="influence-chevron puppet-icon puppet-icon-chevron-down"
              aria-hidden="true"
            />
          </Collapsible.Trigger>
        )
        return props.renderTrigger?.(trigger) ?? trigger
      })()}

      <Collapsible.Content class="influence-drawer" inert={!expanded()}>
        <div class="influence-inline">
          <Index each={draft.relations()}>
            {(_, index) => (
              <InfluenceRelation
                draft={draft}
                index={index}
                count={draft.relations().length}
                parameterValues={props.parameterValues}
                onEditStart={props.onEditStart}
                onEditEnd={props.onEditEnd}
              />
            )}
          </Index>
          <EditorButton
            disabled={props.onChange === undefined || draft.availableSources().length === 0}
            onClick={draft.addRelation}
          >
            기준 추가
          </EditorButton>
        </div>
      </Collapsible.Content>
    </Collapsible>
  )
}
