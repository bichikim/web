import {type Accessor, createMemo} from 'solid-js'
import {
  DEFAULT_TOUCH_JOINT_RESPONSE,
  type PoffoTouch,
  type TouchJointChain,
  type TouchParameterBinding,
} from '@winter-love/wallpaper/settings/touch'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import type {ParameterSource} from '../tracking/use-parameters'
import {interfaceLanguage, text as uiText} from '../localization'
import {jointChainName} from '../builtin-assets/joint-chain-name'
import {parameterName} from '../builtin-assets/parameter-name'
import {jointChainState} from './joint-chain-state'

interface UseTouchEditorOptions {
  readonly source: ParameterSource
  readonly value: Accessor<PoffoTouch>
  readonly onChange?: (value: PoffoTouch) => void | Promise<void>
}

/** Edits chains and individual bindings while retaining their separate stored representations. */
export const useTouchEditor = (options: UseTouchEditorOptions) => {
  const update = (patch: Partial<PoffoTouch>) => options.onChange?.({...options.value(), ...patch})
  const chains = createMemo(() => touchJointChains(options.value()))
  const parameters = () => options.source.touchParameters?.() ?? []
  const names = createMemo(
    () =>
      new Map(
        parameters().map((parameter) => [
          parameter.id,
          `${parameter.name ?? ''} ${parameterName(parameter, interfaceLanguage.language())}`,
        ]),
      ),
  )
  const managed = createMemo(
    () =>
      new Set(
        chains().flatMap((chain) => {
          const state = jointChainState(chain, parameters())
          return chain.enabled && state.kind === 'ready' ? state.parameterIds : []
        }),
      ),
  )
  const catalog = createMemo(() => parameters().filter((parameter) => !managed().has(parameter.id)))
  const selected = createMemo(() => {
    const bindings = options.value().parameters ?? {}
    const ids = new Set(Object.keys(bindings))
    return catalog().filter(
      (parameter) => ids.has(parameter.id) && bindings[parameter.id]?.axis !== 'off',
    )
  })
  const available = createMemo(() =>
    catalog().filter((parameter) => !selected().some((item) => item.id === parameter.id)),
  )
  const items = createMemo(() => [
    ...chains().map((chain) => ({
      chain,
      description: uiText('관절 {value0}개{value1}', {
        value0: String(chain.joints.length),
        value1: chain.enabled ? '' : uiText(' · 꺼짐'),
      }),
      keywords: [
        chain.id,
        chain.name,
        ...chain.joints.map(
          (joint) => `${joint.parameterId ?? ''} ${names().get(joint.parameterId ?? '') ?? ''}`,
        ),
      ].join(' '),
      kind: 'chain' as const,
      label: jointChainName(chain, interfaceLanguage.language()) || uiText('관절 연결'),
      value: `chain:${chain.id}`,
    })),
    ...selected().map((parameter) => ({
      description: uiText('개별 파라미터'),
      keywords: `${parameter.id} ${parameter.name ?? ''}`,
      kind: 'parameter' as const,
      label: parameterName(parameter, interfaceLanguage.language()),
      parameter,
      value: `parameter:${parameter.id}`,
    })),
  ])
  const addChain = async () => {
    const current = chains()
    const names = new Set(current.map((chain) => chain.name))
    const name = Array.from({length: current.length + 1}, (_, index) =>
      uiText('연결 {value0}', {value0: String(index + 1)}),
    ).find((name) => !names.has(name))!
    const id = crypto.randomUUID()
    await update({
      chains: [
        ...current,
        {
          enabled: true,
          id,
          joints: [
            DEFAULT_TOUCH_JOINT_RESPONSE.shoulder,
            DEFAULT_TOUCH_JOINT_RESPONSE.elbow,
            DEFAULT_TOUCH_JOINT_RESPONSE.wrist,
          ].map((response) => ({id: crypto.randomUUID(), response})),
          name,
        },
      ],
      inverseKinematics: true,
    })
    return `chain:${id}`
  }
  const configureChain = (chain: TouchJointChain) =>
    update({
      chains: chains().map((current) => (current.id === chain.id ? chain : current)),
      inverseKinematics: true,
    })
  const removeChain = (id: string) => update({chains: chains().filter((chain) => chain.id !== id)})
  const configureParameter = (id: string, patch: Partial<TouchParameterBinding>) =>
    update({
      parameters: {
        ...options.value().parameters,
        [id]: {...options.value().parameters?.[id], ...patch},
      },
    })
  const addParameter = (id: string) => {
    if (!available().some((parameter) => parameter.id === id)) {
      return
    }
    const previous = options.value().parameters?.[id]
    return configureParameter(id, {
      axis: previous?.axis === 'off' ? 'auto' : (previous?.axis ?? 'auto'),
    })
  }
  const removeParameter = (id: string) =>
    update({
      parameters: Object.fromEntries(
        Object.entries(options.value().parameters ?? {}).filter(([key]) => key !== id),
      ),
    })
  return {
    addChain,
    addParameter,
    available,
    configureChain,
    configureParameter,
    items,
    removeChain,
    removeParameter,
  }
}
