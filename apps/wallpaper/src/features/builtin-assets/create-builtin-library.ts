import {
  createLibraryRepository,
  type LibraryRepository,
} from '@winter-love/wallpaper/settings/library-repository'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {builtinConnectionProfile} from '../connection-profiles/builtin-profile'
import {migrateSemanticActions} from '../connection-profiles/migrate-semantic-actions'
import {isolateHairTouch} from './isolate-hair-touch'
import {migrateAgentActions} from '../connection-profiles/migrate-agent-actions'
import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import type {PoffoConnections} from '@winter-love/wallpaper/settings/connections'
import {SEMANTIC_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {
  type PoffoTrackingBindings,
  poffoTrackingSchema,
} from '@winter-love/wallpaper/settings/tracking'
import {trackingProfile} from '@winter-love/wallpaper/settings/tracking-profile'

const CUSTOM_TOUCH_VERSION = 4
const BODY_TOUCH_VERSION = 5
const CHEST_TOUCH_VERSION = 6
const EXTENDED_TOUCH_VERSION = 9
const HAIR_PHYSICS_VERSION = 11
const BANGS_PHYSICS_VERSION = 12
const ISOLATED_HAIR_VERSION = 13

const HEAD_PARAMETERS = ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ']

const useHairPhysics = (touch: PoffoTouch, defaults: PoffoTouch): PoffoTouch => {
  const chains = new Set([
    'touch:front-left',
    'touch:front-right',
    'touch:side-left',
    'touch:side-right',
  ])
  const retired = new Set([
    'TouchFrontLeft',
    'TouchFrontRight',
    'TouchSideLeft',
    'TouchSideLeftY',
    'TouchSideRight',
    'TouchSideRightY',
  ])
  const ids = [
    'Param19',
    'Param20',
    'Param21',
    'Param22',
    'Param23',
    'Param24',
    'Param28',
    'Param29',
    'Param30',
  ]
  const vertical = new Set(['Param28', 'Param29', 'Param30'])
  const physical = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        ...(vertical.has(id)
          ? {axis: 'y' as const, gain: 1, invert: true}
          : {axis: 'x' as const, gain: 1}),
        ...defaults.parameters?.[id],
        ...touch.parameters?.[id],
      },
    ]),
  )
  return {
    ...touch,
    chains: touch.chains?.filter((chain) => !('id' in chain && chains.has(chain.id))),
    parameters: {
      ...Object.fromEntries(
        Object.entries(touch.parameters ?? {}).filter(([id]) => !retired.has(id)),
      ),
      ...physical,
    },
  }
}

const useBangsPhysics = (touch: PoffoTouch, defaults: PoffoTouch): PoffoTouch => ({
  ...touch,
  chains: touch.chains?.filter((chain) => !('id' in chain && chain.id === 'touch:front-center')),
  parameters: {
    ...Object.fromEntries(
      Object.entries(touch.parameters ?? {}).filter(([id]) => id !== 'TouchFrontCenter'),
    ),
    ...Object.fromEntries(
      ['Param25', 'Param26', 'Param27'].map((id) => [
        id,
        {
          ...defaults.parameters?.[id.replace('Param', 'TouchHairFrontCenter')],
          ...touch.parameters?.[id],
        },
      ]),
    ),
  },
})

const extendTouch = (touch: PoffoTouch, defaults: PoffoTouch): PoffoTouch => {
  const current = touchJointChains(touch)
  const chains = (touch.chains ?? []).map((chain) =>
    !Array.isArray(chain) &&
    'joints' in chain &&
    chain.id === 'touch:bag' &&
    chain.joints.some((joint) => joint.parameterId === 'TouchBagBody')
      ? {...chain, joints: chain.joints.filter((joint) => joint.parameterId !== 'TouchBagBody')}
      : chain,
  )
  const added = touchJointChains(defaults).filter(
    (chain) => chain.id.startsWith('touch:') && !current.some((saved) => saved.id === chain.id),
  )
  const ears = Object.fromEntries(
    Object.entries(defaults.parameters ?? {}).filter(([id]) =>
      ['Param41', 'Param42', 'Param43', 'Param44'].includes(id),
    ),
  )
  const head = Object.fromEntries(
    HEAD_PARAMETERS.map((id) => [
      id,
      {
        ...defaults.parameters?.[id],
        ...touch.parameters?.[id],
        parts: touch.parameters?.[id]?.parts ?? defaults.parameters?.[id]?.parts,
      },
    ]),
  )
  return {
    ...touch,
    chains: [...chains, ...added],
    click: true,
    parameters: {...ears, ...touch.parameters, ...head},
  }
}

const migrateMenus = (
  bindings: readonly SemanticBinding[],
  defaults: PoffoConnections,
  version: number,
): readonly SemanticBinding[] => {
  const migrated = migrateSemanticActions(bindings)
  const coat = defaults.semanticBindings?.find((binding) => binding.id === 'ash:remove-coat')
  return version < (defaults.semanticBindingsVersion ?? 0) &&
    bindings.length > 0 &&
    coat !== undefined &&
    migrated.length < SEMANTIC_LIMIT &&
    !migrated.some((binding) => binding.id === coat.id)
    ? [...migrated, coat]
    : migrated
}

const invertChestDrag = (touch: PoffoTouch): PoffoTouch => ({
  ...touch,
  parameters: Object.fromEntries(
    Object.entries(touch.parameters ?? {}).map(([id, binding]) => [
      id,
      ['Param55', 'Param56'].includes(id) ? {...binding, invert: true} : binding,
    ]),
  ),
})

const addBodyTouch = (current: PoffoTouch, defaults: PoffoTouch): PoffoTouch => {
  const chains = touchJointChains(current)
  const tail = touchJointChains(defaults).find((chain) => chain.id === 'tail')!
  const existing = chains.some(
    (chain) =>
      chain.id === tail.id ||
      (chain.joints.length === tail.joints.length &&
        tail.joints.every((joint) =>
          chain.joints.some((existing) => existing.parameterId === joint.parameterId),
        )),
  )
  const chest = Object.fromEntries(
    Object.entries(defaults.parameters ?? {}).filter(([id]) =>
      ['Param53', 'Param54', 'Param55', 'Param56'].includes(id),
    ),
  )
  return {
    ...defaults,
    ...current,
    chains: existing ? chains : [...chains, tail],
    drag: true,
    enabled: true,
    inverseKinematics: true,
    parameters: {...chest, ...current.parameters},
  }
}

const migrateTouch = (widget: PoffoWidget, defaults: PoffoTouch): PoffoTouch => {
  const current = widget.speech?.touch
  const version = widget.speech?.touchBindingsVersion ?? 0
  const body =
    current !== undefined && version >= CUSTOM_TOUCH_VERSION
      ? version >= BODY_TOUCH_VERSION
        ? current
        : addBodyTouch(current, defaults)
      : {
          ...defaults,
          ...current,
          chains: defaults.chains,
          drag: true,
          enabled: true,
          inverseKinematics: defaults.inverseKinematics,
          jointResponse: current?.jointResponse ?? defaults.jointResponse,
          parameters: {...current?.parameters, ...defaults.parameters},
        }
  const touch = version < CHEST_TOUCH_VERSION ? invertChestDrag(body) : body
  const head = Object.fromEntries(
    Object.entries(defaults.parameters ?? {})
      .filter(([id]) => HEAD_PARAMETERS.includes(id))
      .map(([id, binding]) => [id, current?.parameters?.[id] ?? binding]),
  )
  const combined = {...touch, parameters: {...touch.parameters, ...head}}
  const extended = version < EXTENDED_TOUCH_VERSION ? extendTouch(combined, defaults) : combined
  const hair = version < HAIR_PHYSICS_VERSION ? useHairPhysics(extended, defaults) : extended
  const bangs = version < BANGS_PHYSICS_VERSION ? useBangsPhysics(hair, defaults) : hair
  return version < ISOLATED_HAIR_VERSION ? isolateHairTouch(bangs, defaults) : bangs
}

const missingBody = (widget: PoffoWidget) =>
  poffoTrackingSchema.options.filter(
    (mode) => trackingProfile(widget, mode).bindings?.bodyX === undefined,
  )

const additiveBindings = (
  bindings: PoffoTrackingBindings | undefined,
  defaults: PoffoTrackingBindings,
): PoffoTrackingBindings =>
  Object.fromEntries(
    Object.entries({...defaults, ...bindings}).map(([axis, binding]) => [
      axis,
      {...binding, blend: 'add'},
    ]),
  )

const migrateTracking = (
  widget: PoffoWidget,
  connections: PoffoConnections,
): PoffoConnections | undefined => {
  const defaults = connections.trackingBindings
  if (defaults === undefined) {
    return undefined
  }
  const version = connections.trackingBindingsVersion ?? 0
  if ((widget.trackingBindingsVersion ?? 0) < version) {
    return {
      trackingBindings: additiveBindings(widget.trackingBindings, defaults),
      trackingBindingsVersion: version,
      trackingProfiles: Object.fromEntries(
        poffoTrackingSchema.options.map((mode) => [
          mode,
          {bindings: additiveBindings(trackingProfile(widget, mode).bindings, defaults)},
        ]),
      ),
    }
  }
  const modes = missingBody(widget)
  return defaults.bodyX === undefined || modes.length === 0
    ? undefined
    : {
        trackingProfiles: Object.fromEntries(
          modes.map((mode) => [
            mode,
            {bindings: {...trackingProfile(widget, mode).bindings, bodyX: defaults.bodyX}},
          ]),
        ),
      }
}

export const createBuiltinLibrary = (name: string): LibraryRepository => {
  const repository = createLibraryRepository(name, {
    defaultConnections: (assetId) => builtinConnectionProfile(assetId)?.connections,
    initialWidget: 'builtin:ash',
  })
  const agentVersion =
    builtinConnectionProfile('builtin:ash')?.connections.agentBindingsVersion ?? 0
  const touchVersion =
    builtinConnectionProfile('builtin:ash')?.connections.touchBindingsVersion ?? 0
  const semanticVersion =
    builtinConnectionProfile('builtin:ash')?.connections.semanticBindingsVersion ?? 0
  const trackingVersion =
    builtinConnectionProfile('builtin:ash')?.connections.trackingBindingsVersion ?? 0
  const initializeTouch = async (widget: PoffoWidget) => {
    const defaults = builtinConnectionProfile(widget.assetId)?.connections.touch
    if (defaults !== undefined && (widget.speech?.touchBindingsVersion ?? 0) < touchVersion) {
      await repository.migrateConnections(widget.id, (current) =>
        (current.speech?.touchBindingsVersion ?? 0) < touchVersion
          ? {touch: migrateTouch(current, defaults), touchBindingsVersion: touchVersion}
          : undefined,
      )
    }
  }
  const initialize = async (widget: PoffoWidget) => {
    const profile = builtinConnectionProfile(widget.assetId)
    if (profile === undefined) {
      return
    }
    await repository.migrateConnections(widget.id, (current) =>
      migrateTracking(current, profile.connections),
    )
    await initializeTouch(widget)
    if (
      widget.speech?.agentBindings === undefined ||
      (widget.speech.agentBindingsVersion ?? 0) < agentVersion
    ) {
      await repository.migrateConnections(widget.id, (current) => {
        const bindings = current.speech?.agentBindings
        return bindings === undefined
          ? {agentBindings: profile.connections.agentBindings, agentBindingsVersion: agentVersion}
          : (current.speech?.agentBindingsVersion ?? 0) < agentVersion
            ? {agentBindings: migrateAgentActions(bindings), agentBindingsVersion: agentVersion}
            : undefined
      })
    }
    const version = widget.speech?.semanticBindingsVersion ?? 0
    const bindings = widget.speech?.semanticBindings
    const migrated =
      bindings === undefined ? undefined : migrateMenus(bindings, profile.connections, version)
    const needsSemantic =
      bindings === undefined ||
      migrated !== bindings ||
      widget.speech?.randomActions === undefined ||
      version < semanticVersion
    if (bindings === undefined) {
      await repository.migrateConnections(
        widget.id,
        (current) =>
          current.speech?.semanticBindings === undefined ? profile.connections : undefined,
        'missing',
      )
    }
    if (needsSemantic) {
      await repository.migrateConnections(widget.id, (current) => {
        const {speech} = current
        if (speech?.semanticBindings === undefined) {
          return undefined
        }
        const version = speech.semanticBindingsVersion ?? 0
        const semanticBindings = migrateMenus(speech.semanticBindings, profile.connections, version)
        return semanticBindings !== speech.semanticBindings ||
          speech.randomActions === undefined ||
          version < semanticVersion
          ? {
              randomActions: speech.randomActions ?? profile.connections.randomActions,
              semanticBindings,
              semanticBindingsVersion: semanticVersion,
            }
          : undefined
      })
    }
  }
  return {
    ...repository,
    async addWidget(assetId) {
      const widget = await repository.addWidget(assetId)
      await initialize(widget)
      return (await repository.read()).widgets.find((item) => item.id === widget.id)!
    },
    async read() {
      const snapshot = await repository.read()
      const pending = snapshot.widgets.filter(
        (widget) =>
          widget.assetId === 'builtin:ash' &&
          ((widget.trackingBindingsVersion ?? 0) < trackingVersion ||
            missingBody(widget).length > 0 ||
            (widget.speech?.touchBindingsVersion ?? 0) < touchVersion ||
            widget.speech?.semanticBindings === undefined ||
            widget.speech.agentBindings === undefined ||
            (widget.speech.agentBindingsVersion ?? 0) < agentVersion ||
            widget.speech.randomActions === undefined ||
            (widget.speech.semanticBindingsVersion ?? 0) < semanticVersion ||
            migrateSemanticActions(widget.speech.semanticBindings) !==
              widget.speech.semanticBindings),
      )
      if (pending.length === 0) {
        return snapshot
      }
      await Promise.all(pending.map(initialize))
      return repository.read()
    },
  }
}
