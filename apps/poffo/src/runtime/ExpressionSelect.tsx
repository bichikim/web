import {Show} from 'solid-js'
import {EditorButton, EditorMultiSelect} from '@winter-love/puppet/editor'
import type {PuppetExpression} from '@winter-love/puppet/player'

interface ExpressionSelectProps {
  readonly expressions?: ReadonlyArray<PuppetExpression>
  readonly values?: ReadonlyArray<string>
  readonly disabled?: boolean
  readonly onChange?: (ids: ReadonlyArray<string>) => void
}

export const ExpressionSelect = (props: ExpressionSelectProps) => {
  const clearExpressions = () => props.onChange?.([])
  return (
    <Show when={(props.expressions?.length ?? 0) > 0}>
      <EditorMultiSelect
        size="md"
        label="표정 선택"
        options={props.expressions?.map((expression) => expression.id) ?? []}
        values={props.values}
        disabled={props.disabled}
        onChange={props.onChange}
      />
      <EditorButton
        size="md"
        disabled={props.disabled || (props.values?.length ?? 0) === 0}
        aria-label="표정 모두 해제"
        onClick={clearExpressions}
      >
        모두 해제
      </EditorButton>
    </Show>
  )
}
