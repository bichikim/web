import {Show} from 'solid-js'
import {EditorSelect} from '@winter-love/puppet/editor'
import type {PuppetExpression} from '@winter-love/puppet/player'

interface ExpressionSelectProps {
  readonly expressions?: ReadonlyArray<PuppetExpression>
  readonly value?: string
  readonly disabled?: boolean
  readonly onChange?: (id: string | undefined) => void
}

export const ExpressionSelect = (props: ExpressionSelectProps) => {
  const selected = () => {
    const index = props.expressions?.findIndex((expression) => expression.id === props.value) ?? -1
    return index < 0 ? 'none' : String(index)
  }
  const expressionLabel = (key: string) =>
    key === 'none' ? '표정 해제' : (props.expressions?.[Number(key)]?.id ?? key)
  const handleChange = (key: string) =>
    props.onChange?.(key === 'none' ? undefined : props.expressions?.[Number(key)]?.id)
  return (
    <Show when={(props.expressions?.length ?? 0) > 0}>
      <EditorSelect
        size="md"
        label="표정 선택"
        options={['none', ...(props.expressions?.map((_, index) => String(index)) ?? [])]}
        optionLabel={expressionLabel}
        value={selected()}
        disabled={props.disabled}
        onChange={handleChange}
      />
    </Show>
  )
}
