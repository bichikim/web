import {createMemo, createSignal, Show} from 'solid-js'
import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {
  convertUnit,
  getUnits,
  type UnitCategory,
  type UnitSelection,
  unitSelectionStorage,
  useSelection,
} from 'src/features/tools'
import {PInput} from '../PInput'
import {PSelect} from '../PSelect'
import {PButton} from '../PButton'
import {Result} from './Result'

const SYMBOLS: Readonly<Record<string, string>> = {
  C: '°C',
  F: '°F',
  ft2: 'ft²',
  galUS: 'gal (US)',
  m2: 'm²',
  m3: 'm³',
  pyeong: '평',
}
const categories = () =>
  [
    {label: m.tools_length(), value: 'length'},
    {label: m.tools_mass(), value: 'mass'},
    {label: m.tools_area(), value: 'area'},
    {label: m.tools_volume(), value: 'volume'},
    {label: m.tools_temperature(), value: 'temperature'},
  ] satisfies ReadonlyArray<{label: string; value: UnitCategory}>
export const Units = () => {
  const selection = useSelection<UnitSelection>({
    initial: {category: 'length', from: 'm', to: 'ft'},
    storage: unitSelectionStorage,
  })
  const category = createMemo(() => selection.value().category)
  const [input, setInput] = createSignal('1')
  const from = () => selection.value().from
  const to = () => selection.value().to
  const options = createMemo(() =>
    getUnits(category(), getLocale()).map((unit) => ({
      label: SYMBOLS[unit.id] ?? unit.id,
      value: unit.id,
    })),
  )
  const source = () =>
    options().some((option) => option.value === from()) ? from() : options()[0].value
  const target = () =>
    options().some((option) => option.value === to()) ? to() : options()[1].value
  const result = createMemo(() => convertUnit({from: source(), to: target(), value: input()}))
  const output = () => {
    const value = result()
    if (value.kind !== 'valid') {
      return ''
    }
    const formatted = new Intl.NumberFormat(getLocale(), {maximumSignificantDigits: 12}).format(
      value.value,
    )
    return `${formatted} ${SYMBOLS[target()] ?? target()}`
  }
  const reset = () => {
    selection.onChange({category: 'length', from: 'm', to: 'ft'})
    setInput('1')
  }
  return (
    <div class="grid gap-4">
      <PSelect
        label={m.tools_category()}
        options={categories()}
        value={category()}
        disabled={!selection.ready()}
        onChange={(value) => {
          const units = getUnits(value, getLocale())
          selection.onChange({category: value, from: units[0].id, to: units[1].id})
        }}
      />
      <label class="grid gap-1.5 text-sm text-muted-foreground">
        {m.tools_value()}
        <PInput
          type="text"
          inputmode="decimal"
          value={input()}
          onInput={(event) => setInput(event.currentTarget.value)}
          aria-invalid={result().kind === 'invalid'}
        />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <PSelect
          label={m.tools_from()}
          options={options()}
          value={source()}
          disabled={!selection.ready()}
          onChange={(from) => selection.onChange({...selection.value(), from, to: target()})}
        />
        <PSelect
          label={m.tools_to()}
          options={options()}
          value={target()}
          disabled={!selection.ready()}
          onChange={(to) => selection.onChange({...selection.value(), from: source(), to})}
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <PButton
          bordered
          transparent
          icon="i-tabler-arrows-exchange"
          disabled={!selection.ready()}
          onPress={() => {
            selection.onChange({category: category(), from: target(), to: source()})
          }}
        >
          {m.tools_swap()}
        </PButton>
        <PButton transparent disabled={!selection.ready()} onPress={reset}>
          {m.tools_reset()}
        </PButton>
      </div>
      <Show
        when={output()}
        fallback={
          <p role="status" class="text-sm text-muted-foreground">
            {result().kind === 'empty' ? m.tools_empty() : m.tools_invalid()}
          </p>
        }
      >
        {(value) => <Result value={value()} />}
      </Show>
      <p class="m-0 text-sm text-muted-foreground">{m.tools_precision()}</p>
    </div>
  )
}
