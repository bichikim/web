import {createUniqueId, For} from 'solid-js'
import type {InfluenceDirection} from './use-influence-settings'

interface InfluencePresetsProps {
  readonly compact?: boolean
  readonly value: InfluenceDirection
  readonly onChange: (value: InfluenceDirection) => void
}

const PRESETS = [
  {label: '약하게', points: '0,0 100,100', value: 'decrease'},
  {label: '강하게', points: '0,100 100,0', value: 'increase'},
  {label: '중간에서 최대', points: '0,100 50,0 100,100', value: 'peak'},
  {label: '직접 설정', points: '0,80 30,20 65,60 100,40', value: 'custom'},
] as const

export const InfluencePresets = (props: InfluencePresetsProps) => {
  const name = createUniqueId()
  return (
    <fieldset class="influence-presets" data-compact={props.compact || undefined}>
      <legend>곡선 모양</legend>
      <For each={props.compact ? PRESETS.filter((preset) => preset.value !== 'custom') : PRESETS}>
        {(preset) => (
          <label>
            <input
              type="radio"
              name={name}
              value={preset.value}
              checked={props.value === preset.value}
              onChange={() => props.onChange(preset.value)}
            />
            <span class="editor-button">
              <svg viewBox="-5 -5 110 110" aria-hidden="true">
                <polyline points={preset.points} />
              </svg>
              {preset.label}
            </span>
          </label>
        )}
      </For>
    </fieldset>
  )
}
