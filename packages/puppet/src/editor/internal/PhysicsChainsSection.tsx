import {For, Index, Show} from 'solid-js'

import {EditorButton, EditorCheckbox, EditorNumberField, EditorSelect} from '../../design-system'
import {
  DEFAULT_PUPPET_CHAIN_FPS,
  DEFAULT_PUPPET_CHAIN_GRAVITY,
  PUPPET_PHYSICS_AXES,
  type PuppetDocument,
  type PuppetPhysicsChain,
  type PuppetPhysicsRange,
} from '../../player'
import {
  addPhysicsChain,
  createChainInput,
  createChainOutput,
  DEFAULT_CHAIN_PENDULUM,
  getParameterChains,
  patchItem,
  removePhysicsChain,
  setPhysicsWorld,
  updatePhysicsChain,
} from './physics-chains'
import {KeyedFor} from './KeyedFor'

export interface PhysicsChainsSectionProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly inputParameterIds?: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

interface ChainProps {
  readonly chain: PuppetPhysicsChain
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly update: (change: (chain: PuppetPhysicsChain) => PuppetPhysicsChain) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const AXIS_LABELS = {angle: '각도', x: 'X 위치', y: 'Y 위치'} as const
const isAxis = (value: string) => PUPPET_PHYSICS_AXES.find((axis) => axis === value)
const RATIO_STEP = 0.05

const parameterOptions = (document: PuppetDocument) =>
  (document.parameters ?? []).map((parameter) => parameter.id)

const parameterLabel = (document: PuppetDocument) => (id: string) =>
  document.parameters?.find((parameter) => parameter.id === id)?.name ?? id

const ChainInputs = (props: ChainProps) => (
  <fieldset class="preset-fields">
    <legend>입력</legend>
    <Index each={props.chain.inputs}>
      {(input, index) => (
        <div class="preset-fields">
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 파라미터`}
            optionLabel={parameterLabel(props.document)}
            options={parameterOptions(props.document)}
            value={input().parameterId}
            onChange={(parameterId) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {parameterId}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 종류`}
            optionLabel={(axis) => AXIS_LABELS[isAxis(axis) ?? 'x']}
            options={PUPPET_PHYSICS_AXES}
            value={input().axis}
            onChange={(value) => {
              const axis = isAxis(value)
              if (axis !== undefined) {
                props.update((chain) => ({
                  ...chain,
                  inputs: patchItem(chain.inputs, index, {axis}),
                }))
              }
            }}
          />
          <EditorNumberField
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 영향도`}
            maximum={1}
            minimum={0}
            name={`${props.chain.id}-input-${index}-weight`}
            step={RATIO_STEP}
            value={input().weight}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(weight) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {weight}),
              }))
            }
          />
          <EditorCheckbox
            checked={input().reflect === true}
            disabled={props.disabled}
            label={`${props.chain.id} 입력 ${index + 1} 반전`}
            onChange={(reflect) =>
              props.update((chain) => ({
                ...chain,
                inputs: patchItem(chain.inputs, index, {reflect}),
              }))
            }
          />
          <EditorButton
            aria-label={`${props.chain.id} 입력 ${index + 1} 삭제`}
            disabled={props.disabled || props.chain.inputs.length === 1}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                inputs: chain.inputs.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled || createChainInput(props.document, props.chain) === undefined}
      onClick={() => {
        const input = createChainInput(props.document, props.chain)
        if (input !== undefined) {
          props.update((chain) => ({...chain, inputs: [...chain.inputs, input]}))
        }
      }}
    >
      입력 추가
    </EditorButton>
  </fieldset>
)

const PENDULUM_FIELDS = [
  {label: '길이', minimum: 0.01, property: 'length', step: 1},
  {label: '흔들림(이동성)', maximum: 1, minimum: 0, property: 'mobility', step: RATIO_STEP},
  {label: '반응 속도', minimum: 0.01, property: 'reaction', step: 0.1},
  {label: '가속도', property: 'acceleration', step: 0.1},
] as const

const ChainPendulums = (props: ChainProps) => (
  <fieldset class="preset-fields">
    <legend>진자 (위에서 아래로)</legend>
    <Index each={props.chain.pendulums}>
      {(pendulum, index) => (
        <div class="preset-fields">
          <For each={PENDULUM_FIELDS}>
            {(field) => (
              <EditorNumberField
                disabled={props.disabled}
                label={`${props.chain.id} 진자 ${index + 1} ${field.label}`}
                maximum={'maximum' in field ? field.maximum : undefined}
                minimum={'minimum' in field ? field.minimum : undefined}
                name={`${props.chain.id}-pendulum-${index}-${field.property}`}
                step={field.step}
                value={pendulum()[field.property]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.update((chain) => ({
                    ...chain,
                    pendulums: patchItem(chain.pendulums, index, {[field.property]: value}),
                  }))
                }
              />
            )}
          </For>
          <EditorButton
            aria-label={`${props.chain.id} 진자 ${index + 1} 삭제`}
            disabled={props.disabled || props.chain.pendulums.length === 1}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                outputs: chain.outputs
                  .filter((output) => output.pendulumIndex !== index)
                  .map((output) =>
                    output.pendulumIndex > index
                      ? {...output, pendulumIndex: output.pendulumIndex - 1}
                      : output,
                  ),
                pendulums: chain.pendulums.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled}
      onClick={() =>
        props.update((chain) => ({
          ...chain,
          pendulums: [...chain.pendulums, DEFAULT_CHAIN_PENDULUM],
        }))
      }
    >
      진자 추가
    </EditorButton>
  </fieldset>
)

const OUTPUT_NUMBER_FIELDS = [
  {label: '배율', property: 'scale', step: 0.1},
  {label: '영향도', maximum: 1, minimum: 0, property: 'weight', step: RATIO_STEP},
] as const

const ChainOutputs = (props: ChainProps) => (
  <fieldset class="preset-fields">
    <legend>출력</legend>
    <Index each={props.chain.outputs}>
      {(output, index) => (
        <div class="preset-fields">
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 파라미터`}
            optionLabel={parameterLabel(props.document)}
            options={parameterOptions(props.document)}
            value={output().parameterId}
            onChange={(parameterId) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {parameterId}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 진자`}
            optionLabel={(value) => `진자 ${Number(value) + 1}`}
            options={props.chain.pendulums.map((_, at) => String(at))}
            value={String(output().pendulumIndex)}
            onChange={(value) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {pendulumIndex: Number(value)}),
              }))
            }
          />
          <EditorSelect
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 종류`}
            optionLabel={(axis) => AXIS_LABELS[isAxis(axis) ?? 'x']}
            options={PUPPET_PHYSICS_AXES}
            value={output().axis}
            onChange={(value) => {
              const axis = isAxis(value)
              if (axis !== undefined) {
                props.update((chain) => ({
                  ...chain,
                  outputs: patchItem(chain.outputs, index, {axis}),
                }))
              }
            }}
          />
          <For each={OUTPUT_NUMBER_FIELDS}>
            {(field) => (
              <EditorNumberField
                disabled={props.disabled}
                label={`${props.chain.id} 출력 ${index + 1} ${field.label}`}
                maximum={'maximum' in field ? field.maximum : undefined}
                minimum={'minimum' in field ? field.minimum : undefined}
                name={`${props.chain.id}-output-${index}-${field.property}`}
                step={field.step}
                value={output()[field.property]}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.update((chain) => ({
                    ...chain,
                    outputs: patchItem(chain.outputs, index, {[field.property]: value}),
                  }))
                }
              />
            )}
          </For>
          <EditorCheckbox
            checked={output().reflect === true}
            disabled={props.disabled}
            label={`${props.chain.id} 출력 ${index + 1} 반전`}
            onChange={(reflect) =>
              props.update((chain) => ({
                ...chain,
                outputs: patchItem(chain.outputs, index, {reflect}),
              }))
            }
          />
          <EditorButton
            aria-label={`${props.chain.id} 출력 ${index + 1} 삭제`}
            disabled={props.disabled}
            onClick={() =>
              props.update((chain) => ({
                ...chain,
                outputs: chain.outputs.filter((_, at) => at !== index),
              }))
            }
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
          </EditorButton>
        </div>
      )}
    </Index>
    <EditorButton
      disabled={props.disabled || createChainOutput(props.document, props.chain) === undefined}
      onClick={() => {
        const output = createChainOutput(props.document, props.chain)
        if (output !== undefined) {
          props.update((chain) => ({...chain, outputs: [...chain.outputs, output]}))
        }
      }}
    >
      출력 추가
    </EditorButton>
  </fieldset>
)

const RANGE_KEYS = [
  ['minimum', '최소'],
  ['center', '중심'],
  ['maximum', '최대'],
] as const

const ChainNormalization = (props: ChainProps) => (
  <details class="preset-settings">
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
        <div class="preset-fields">
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

const WORLD_FIELDS = [
  {axis: 0, label: '중력 방향 X', property: 'gravity'},
  {axis: 1, label: '중력 방향 Y', property: 'gravity'},
  {axis: 0, label: '바람 X', property: 'wind'},
  {axis: 1, label: '바람 Y', property: 'wind'},
] as const

const WorldSettings = (props: PhysicsChainsSectionProps) => {
  const vector = (property: 'gravity' | 'wind') =>
    props.document.physics?.[property] ??
    (property === 'gravity' ? DEFAULT_PUPPET_CHAIN_GRAVITY : ([0, 0] as const))
  const apply = (document: PuppetDocument) => {
    if (!props.disabled) {
      props.onDocumentChange?.(document)
    }
  }
  return (
    <details class="preset-settings">
      <summary>체인 공통 설정</summary>
      <div class="preset-fields">
        <For each={WORLD_FIELDS}>
          {(field) => (
            <EditorNumberField
              disabled={props.disabled}
              label={field.label}
              name={`physics-${field.property}-${field.axis}`}
              step="any"
              value={vector(field.property)[field.axis]}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(value) => {
                const next = [...vector(field.property)] as [number, number]
                next[field.axis] = value
                // Gravity is a direction; it needs some length.
                if (field.property === 'wind' || next.some((part) => part !== 0)) {
                  apply(setPhysicsWorld(props.document, {[field.property]: next}))
                }
              }}
            />
          )}
        </For>
        <EditorNumberField
          disabled={props.disabled}
          label="계산 FPS"
          maximum={240}
          minimum={1}
          name="physics-fps"
          step={1}
          value={props.document.physics?.fps ?? DEFAULT_PUPPET_CHAIN_FPS}
          onEditEnd={props.onEditEnd}
          onEditStart={props.onEditStart}
          onValueChange={(fps) => apply(setPhysicsWorld(props.document, {fps}))}
        />
      </div>
    </details>
  )
}

/** Pendulum chains whose inputs include the selected parameters, with shared world settings. */
export const PhysicsChainsSection = (props: PhysicsChainsSectionProps) => {
  const chains = () => getParameterChains(props.document, props.inputParameterIds)
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !props.disabled) {
      props.onDocumentChange?.(document)
    }
  }
  const firstInput = () => props.inputParameterIds?.[0] ?? props.document.parameters?.[0]?.id
  return (
    <>
      <div class="physics-header">
        <span>체인 {chains().length}개</span>
        <EditorButton
          class="physics-action-button"
          disabled={props.disabled || firstInput() === undefined}
          onClick={() => {
            const input = firstInput()
            commit(
              input === undefined ? undefined : addPhysicsChain(props.document, input)?.document,
            )
          }}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          진자 체인 추가
        </EditorButton>
      </div>
      <KeyedFor each={chains()} key={(chain) => chain.id}>
        {(chain) => {
          const shared = {
            get chain() {
              return chain()
            },
            get disabled() {
              return props.disabled
            },
            get document() {
              return props.document
            },
            onEditEnd: props.onEditEnd,
            onEditStart: props.onEditStart,
            update: (change: (current: PuppetPhysicsChain) => PuppetPhysicsChain) =>
              commit(updatePhysicsChain(props.document, chain().id, change)),
          }
          return (
            <article class="preset-card">
              <header class="preset-card-header">
                <h3>{chain().id}</h3>
                <EditorButton
                  aria-label={`${chain().id} 체인 삭제`}
                  class="preset-remove-button"
                  disabled={props.disabled}
                  onClick={() => commit(removePhysicsChain(props.document, chain().id))}
                >
                  <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
                </EditorButton>
              </header>
              <ChainInputs {...shared} />
              <ChainPendulums {...shared} />
              <ChainOutputs {...shared} />
              <ChainNormalization {...shared} />
            </article>
          )
        }}
      </KeyedFor>
      <Show when={(props.document.physics?.chains?.length ?? 0) > 0}>
        <WorldSettings {...props} />
      </Show>
    </>
  )
}
