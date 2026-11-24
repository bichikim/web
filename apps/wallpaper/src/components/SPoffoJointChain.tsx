import {interfaceLanguage, text as uiText} from '../features/localization'
import {jointChainName} from '../features/builtin-assets/joint-chain-name'
import {createMemo, For, Show} from 'solid-js'
import type {TouchJoint, TouchJointChain} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter} from '../features/touch'
import {jointChainState} from '../features/touch/joint-chain-state'
import {SPoffoJoint} from './SPoffoJoint'
import {SSwitch} from './SSwitch'

interface SPoffoJointChainProps {
  readonly value: TouchJointChain
  readonly parameters: readonly TouchParameter[]
  readonly disabled?: boolean
  readonly onChange?: (value: TouchJointChain) => void | Promise<void>
  readonly onRemove?: () => void | Promise<void>
}
const ORIENTATION_JOINTS = 3
const MESSAGES = {
  get duplicate() {
    return uiText('각 관절에 서로 다른 파라미터를 선택해 주세요.')
  },
  get incomplete() {
    return uiText('각 관절의 파라미터를 선택해 주세요.')
  },
  get missing() {
    return uiText('모델에 없는 파라미터를 다시 선택해 주세요.')
  },
  get nonrotation() {
    return uiText('회전 관절 파라미터를 선택해 주세요.')
  },
  get unrelated() {
    return uiText('같은 체인에 속한 관절을 순서대로 연결해 주세요.')
  },
}

export const SPoffoJointChain = (props: SPoffoJointChainProps) => {
  const name = () => jointChainName(props.value, interfaceLanguage.language())
  const label = () => name() || uiText('관절 연결')
  const disabled = () => props.disabled || props.onChange === undefined
  const update = (patch: Partial<TouchJointChain>) => props.onChange?.({...props.value, ...patch})
  const handleName = (event: Event & {currentTarget: HTMLInputElement}) => {
    const next = event.currentTarget.value.trim() || uiText('관절 연결')
    if (next !== label()) {
      return update({name: next})
    }
  }
  const handleEnabled = (enabled: boolean) => update({enabled})
  const handleRemove = () => props.onRemove?.()
  const configureJoint = (joint: TouchJoint) =>
    update({
      joints: props.value.joints.map((current) => (current.id === joint.id ? joint : current)),
    })
  const removeJoint = (id: string) =>
    update({joints: props.value.joints.filter((joint) => joint.id !== id)})
  const moveJoint = (id: string, direction: number) => {
    const joints = [...props.value.joints]
    const index = joints.findIndex((joint) => joint.id === id)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= joints.length) {
      return
    }
    const moving = joints[index]!
    joints[index] = joints[destination]!
    joints[destination] = moving
    return update({joints})
  }
  const handleAdd = () =>
    update({joints: [...props.value.joints, {id: crypto.randomUUID(), response: 1}]})
  const handleAngle = (preserveAngle: boolean) => update({preserveAngle})
  const state = createMemo(() => jointChainState(props.value, props.parameters))
  const message = () => {
    const current = state()
    return current.kind === 'ready' ? null : MESSAGES[current.kind]
  }
  return (
    <fieldset
      aria-label={label()}
      class="m-0 grid min-w-0 gap-3 rounded-lg border border-solid border-stone-200 p-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <input
          aria-label={uiText('관절 연결 이름')}
          value={name()}
          disabled={disabled()}
          onChange={handleName}
          class="wallpaper-field min-w-0 flex-1 font-medium"
        />
        <SSwitch
          label={uiText('{value0} 사용', {value0: String(label())})}
          checked={props.value.enabled}
          disabled={disabled()}
          onChange={handleEnabled}
        />
        <button
          type="button"
          aria-label={uiText('{value0} 삭제', {value0: String(label())})}
          onClick={handleRemove}
          disabled={props.disabled || props.onRemove === undefined}
          class="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent text-stone-500
            hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2
            focus-visible:outline-blue-700 disabled:opacity-40"
        >
          ×
        </button>
      </div>
      <div class="grid grid-cols-[1rem_minmax(0,1fr)_4.5rem_4.5rem] gap-1.5 text-xs text-stone-600">
        <span class="col-span-2">{uiText('시작 → 끝')}</span>
        <span class="text-center">{uiText('반응 %')}</span>
        <span class="sr-only">{uiText('순서·삭제')}</span>
      </div>
      <div class="grid max-h-72 gap-2 overflow-y-auto overscroll-contain p-0.5">
        <For each={props.value.joints.map((joint) => joint.id)}>
          {(id, index) => {
            const value = () => props.value.joints.find((joint) => joint.id === id)!
            const remove = () => removeJoint(id)
            const move = (direction: number) => moveJoint(id, direction)
            return (
              <SPoffoJoint
                value={value()}
                joints={props.value.joints}
                name={label()}
                position={index()}
                parameters={props.parameters}
                disabled={disabled()}
                onChange={configureJoint}
                onRemove={remove}
                onMove={move}
              />
            )
          }}
        </For>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled()}
          class="wallpaper-file-button text-xs"
        >
          {uiText('+ 관절')}
        </button>
        <Show when={props.value.joints.length >= ORIENTATION_JOINTS}>
          <label class="flex items-center gap-2 text-xs text-stone-600">
            {uiText('끝 방향 유지')}
            <SSwitch
              label={uiText('{value0} 끝 방향 유지', {value0: String(label())})}
              checked={props.value.preserveAngle ?? false}
              disabled={disabled()}
              onChange={handleAngle}
            />
          </label>
        </Show>
      </div>
      <Show when={message()}>
        {(text) => (
          <p role="status" class="m-0 text-xs leading-relaxed text-stone-500">
            {text()}
          </p>
        )}
      </Show>
    </fieldset>
  )
}
