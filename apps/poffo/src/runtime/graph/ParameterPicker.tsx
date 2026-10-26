import {createMemo, createSignal} from 'solid-js'
import {type EditorSearchOption, EditorSearchSelect} from '@winter-love/puppet/editor'
import type {PuppetParameter} from '@winter-love/puppet/player'
interface ParameterPickerProps {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly onAdd: (id: string) => void
}
export const ParameterPicker = (props: ParameterPickerProps) => {
  const [selection, setSelection] = createSignal<EditorSearchOption | null>(null)
  const options = createMemo(() =>
    props.parameters.map((parameter) => ({label: parameter.name, value: parameter.id})),
  )
  const handleChange = (option: EditorSearchOption | null) => {
    if (option !== null) {
      const id = option.value
      const add = props.onAdd
      setSelection(option)
      queueMicrotask(() => {
        setSelection(null)
        add(id)
      })
    }
  }
  return (
    <EditorSearchSelect
      label="파라미터 추가"
      triggerLabel="파라미터 목록 열기"
      options={options()}
      value={selection()}
      onChange={handleChange}
    />
  )
}
