import {interfaceLanguage, text as uiText} from '../features/localization'
import {jointChainName} from '../features/builtin-assets/joint-chain-name'
import {parameterName} from '../features/builtin-assets/parameter-name'
import {createMemo, createSignal} from 'solid-js'
import {type PoffoTouch, type TouchJointChain} from '@winter-love/wallpaper/settings/touch'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SPoffoJointChain} from './SPoffoJointChain'
import {SSettingsEditor} from './SSettingsEditor'

interface SPoffoJointChainsProps {
  readonly source: ParameterSource
  readonly value?: PoffoTouch
  readonly onChange?: (patch: Partial<PoffoTouch>) => void | Promise<void>
}

const INITIAL_RESPONSE = {end: 1, middle: 0.6, root: 0.25}

export const SPoffoJointChains = (props: SPoffoJointChainsProps) => {
  const [panel, setPanel] = createSignal<HTMLElement | null>(null)
  const chains = createMemo(() => touchJointChains(props.value))
  const names = createMemo(
    () =>
      new Map(
        (props.source.touchParameters?.() ?? []).map((parameter) => [
          parameter.id,
          `${parameter.name ?? ''} ${parameterName(parameter, interfaceLanguage.language())}`,
        ]),
      ),
  )
  const options = createMemo(() =>
    chains().map((chain) => ({
      get description() {
        return uiText('관절 {value0}개{value1}', {
          value0: String(chain.joints.length),
          value1: String(chain.enabled ? '' : uiText(' · 꺼짐')),
        })
      },
      keywords: [
        chain.name,
        ...chain.joints.map(
          (joint) => `${joint.parameterId ?? ''} ${names().get(joint.parameterId ?? '') ?? ''}`,
        ),
      ].join(' '),
      label: jointChainName(chain, interfaceLanguage.language()) || uiText('관절 연결'),
      value: chain.id,
    })),
  )
  const disabled = () => props.onChange === undefined || props.source.loading()
  const add = async (edit: (id: string) => void) => {
    const current = chains()
    const names = new Set(current.map((chain) => chain.name))
    const name = Array.from({length: current.length + 1}, (_, index) =>
      uiText('연결 {value0}', {value0: String(index + 1)}),
    ).find((name) => !names.has(name))!
    const id = crypto.randomUUID()
    await props.onChange?.({
      chains: [
        ...current,
        {
          enabled: true,
          id,
          joints: [INITIAL_RESPONSE.root, INITIAL_RESPONSE.middle, INITIAL_RESPONSE.end].map(
            (response) => ({id: crypto.randomUUID(), response}),
          ),
          name,
        },
      ],
      inverseKinematics: true,
    })
    edit(id)
    const field = panel()?.querySelector<HTMLInputElement>(
      `input[aria-label=${JSON.stringify(uiText('관절 연결 이름'))}]`,
    )
    field?.focus()
    field?.select()
  }
  const configure = (value: TouchJointChain) =>
    props.onChange?.({
      chains: chains().map((chain) => (chain.id === value.id ? value : chain)),
      inverseKinematics: true,
    })
  const remove = (id: string) =>
    props.onChange?.({chains: chains().filter((chain) => chain.id !== id)})
  const actions = (edit: (id: string) => void) => {
    const handleAdd = () => add(edit)
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled()}
        class="wallpaper-file-button min-h-7 text-xs disabled:cursor-default disabled:opacity-50"
      >
        {uiText('+ 관절 연결')}
      </button>
    )
  }
  return (
    <section
      ref={setPanel}
      aria-label={uiText('관절 연결')}
      class="grid min-w-0 gap-3 border-0 border-t border-solid border-stone-200 pt-3"
    >
      <SSettingsEditor
        label={uiText('관절 연결')}
        options={options()}
        actions={actions}
        emptyMessage={uiText('꼬리·귀·팔다리 등 연결할 관절을 추가해 주세요.')}
      >
        {(id) => (
          <SPoffoJointChain
            value={chains().find((chain) => chain.id === id)!}
            parameters={props.source.touchParameters?.() ?? []}
            disabled={disabled()}
            onChange={configure}
            onRemove={() => remove(id)}
          />
        )}
      </SSettingsEditor>
    </section>
  )
}
