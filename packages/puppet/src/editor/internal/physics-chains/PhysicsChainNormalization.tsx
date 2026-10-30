import {For} from 'solid-js'
import {EditorNumberField} from '../../../design-system'
import type {PuppetPhysicsRange} from '../../../player'
import type {ChainProps} from './types'

const RANGE_KEYS = [
  ['minimum', '최소'],
  ['center', '중심'],
  ['maximum', '최대'],
] as const

export const PhysicsChainNormalization = (props: ChainProps) => (
  <details class="entry-settings">
    <summary>정규화 범위</summary>
    <For
      each={
        [
          ['position', '위치'],
          ['angle', '각도'],
        ] as const
      }
    >
      {([kind, label]) => (
        <div class="entry-fields">
          <For each={RANGE_KEYS}>
            {([key, keyLabel]) => (
              <EditorNumberField
                disabled={props.disabled}
                label={`${props.chain.id} ${label} ${keyLabel}`}
                name={`${props.chain.id}-${kind}-${key}`}
                step="any"
                value={props.chain.normalization[kind][key]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.update((chain) => {
                    const range: PuppetPhysicsRange = {...chain.normalization[kind], [key]: value}
                    return range.minimum <= range.center && range.center <= range.maximum
                      ? {...chain, normalization: {...chain.normalization, [kind]: range}}
                      : chain
                  })
                }
              />
            )}
          </For>
        </div>
      )}
    </For>
  </details>
)
