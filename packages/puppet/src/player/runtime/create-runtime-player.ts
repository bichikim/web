import type {PuppetParameterValueMap} from '../../deformation'
import {createEyeBlinkState, resolveEyeBlinkTiming} from '../eye-blink'
import {findHitArea} from '../internal/hit-area'
import {createPhysicsState} from '../internal/physics'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from '../internal/prepared-document'
import {setRenderOverride} from '../internal/render-overrides'
import {resolveParameterOverrides} from '../internal/resolve-parameter-overrides'
import {getSceneGroupIds} from '../internal/scene-groups'
import {resolveParameterValue} from '../parameter-value'
import type {Player} from '../player-types'
import {normalizeVowelWeights} from '../voice/mouth-shapes'
import type {CreateRuntimePlayerOptions} from './types'
import {createPlaybackCommands} from './create-playback-commands'
const createParameterCommands = (
  options: CreateRuntimePlayerOptions,
): Pick<
  Player,
  | 'clearParameterValues'
  | 'patchParameterValues'
  | 'patchParameterBlends'
  | 'resetMotionHistory'
  | 'resetParameters'
  | 'setParameterBlend'
  | 'setParameterValue'
  | 'setParameterValues'
  | 'setPhysicsOptions'
  | 'setPhysicsPreview'
  | 'getParameterValue'
  | 'getParameterValues'
> => {
  const {state, refresh, redraw, applyFrame, syncTicker} = options
  const {adjustments} = state
  return {
    clearParameterValues(parameterIds) {
      if (state.destroyed) {
        return
      }
      const ids = new Set(parameterIds ?? Object.keys(state.parameterValues))
      state.parameterValues = Object.fromEntries(
        Object.entries(state.parameterValues).filter(([id]) => !ids.has(id)),
      )
      refresh()
    },
    getParameterValue(parameterId) {
      return Object.hasOwn(state.frameValues, parameterId)
        ? state.frameValues[parameterId]
        : undefined
    },
    getParameterValues: () => ({...state.frameValues}),
    patchParameterBlends(values, stage = 'before-physics') {
      if (!state.destroyed && (stage === 'before-physics' || stage === 'after-physics')) {
        for (const [id, blend] of Object.entries(values)) {
          adjustments.setParameterBlend(state.document, id, blend, stage)
        }
        refresh()
      }
    },
    patchParameterValues(values) {
      if (state.destroyed) {
        return
      }
      const resolved = resolveParameterOverrides(state.document, values)
      if (Object.entries(resolved).some(([id, value]) => state.parameterValues[id] !== value)) {
        state.parameterValues = {...state.parameterValues, ...resolved}
        refresh()
      }
    },
    resetMotionHistory(parameterIds) {
      if (!state.destroyed) {
        state.motionHistory.reset(parameterIds)
        refresh()
      }
    },
    resetParameters(parameterIds) {
      if (state.destroyed) {
        return
      }
      const ids = parameterIds === undefined ? undefined : new Set(parameterIds)
      state.parameterValues = {
        ...state.parameterValues,
        ...Object.fromEntries(
          (state.document.parameters ?? [])
            .filter((parameter) => ids === undefined || ids.has(parameter.id))
            .map((parameter) => [parameter.id, parameter.defaultValue]),
        ),
      }
      refresh()
    },
    setParameterBlend(parameterId, blend) {
      if (state.destroyed || !adjustments.setParameterBlend(state.document, parameterId, blend)) {
        return false
      }
      refresh()
      return true
    },
    setParameterValue(parameterId, value) {
      const parameter = state.document.parameters?.find((candidate) => candidate.id === parameterId)
      if (state.destroyed || parameter === undefined) {
        return false
      }
      state.parameterValues = {
        ...state.parameterValues,
        [parameterId]: resolveParameterValue(parameter, value),
      }
      refresh()
      return true
    },
    setParameterValues(values) {
      if (state.destroyed) {
        return
      }
      state.parameterValues = resolveParameterOverrides(state.document, values)
      refresh()
    },
    setPhysicsOptions(options) {
      if (state.destroyed || !adjustments.setPhysicsOptions(options)) {
        return false
      }
      refresh()
      return true
    },
    setPhysicsPreview(enabled) {
      if (state.destroyed || state.physicsPreview === enabled) {
        return
      }
      state.physicsPreview = enabled
      applyFrame(0, true)
      redraw()
      syncTicker()
    },
  }
}
const createEffectCommands = (
  options: CreateRuntimePlayerOptions,
): Pick<
  Player,
  | 'setBreath'
  | 'setExpression'
  | 'setExpressions'
  | 'setExpressionLayer'
  | 'setEyeBlink'
  | 'setEyeBlinkTiming'
  | 'setLipSync'
  | 'setLookTarget'
  | 'setModelOpacity'
  | 'setVowelWeights'
  | 'getExpression'
> => {
  const {state, refresh, syncTicker} = options
  const {expressions, lookAndBreath, random} = state
  return {
    getExpression: () => expressions.current(),
    setBreath(enabled) {
      if (!state.destroyed && lookAndBreath.setBreath(enabled)) {
        refresh()
      }
    },
    setExpression(expressionId) {
      if (state.destroyed || !expressions.set(expressionId)) {
        return false
      }
      refresh()
      return true
    },
    setExpressionLayer: (layerId, id) =>
      !state.destroyed && state.expressionLayers.set(layerId, id),
    setExpressions(expressionIds) {
      if (state.destroyed || !expressions.setMany(expressionIds)) {
        return false
      }
      refresh()
      return true
    },
    setEyeBlink(enabled) {
      if (state.destroyed || enabled === (state.eyeBlink !== undefined)) {
        return
      }
      state.eyeBlink = enabled ? createEyeBlinkState(state.eyeBlinkTiming, random) : undefined
      refresh()
    },
    setEyeBlinkTiming(timing) {
      const resolved = resolveEyeBlinkTiming(timing)
      if (state.destroyed || resolved === undefined) {
        return false
      }
      state.eyeBlinkTiming = resolved
      return true
    },
    setLipSync(level) {
      state.lipSyncLevel = level !== undefined && Number.isFinite(level) ? level : undefined
      refresh()
    },
    setLookTarget(target) {
      if (!state.destroyed) {
        lookAndBreath.setLookTarget(target)
        syncTicker()
      }
    },
    setModelOpacity(opacity) {
      // Like the other setters, non-finite input changes nothing.
      if (Number.isFinite(opacity)) {
        state.modelOpacity = Math.min(1, Math.max(0, opacity))
        refresh()
      }
    },
    setVowelWeights(weights) {
      if (state.destroyed) {
        return
      }
      state.voiceTarget = weights === undefined ? undefined : normalizeVowelWeights(weights)
      syncTicker()
    },
  }
}
/** Composes Player commands without taking lifecycle ownership from the runtime. */
export const createRuntimePlayer = (options: CreateRuntimePlayerOptions): Player => {
  const {state, renderer, sounds, effects, refresh, redraw, syncTicker, dispose, applyFrame} =
    options
  const {motionHistory, notices, playback, playbacks, expressions} = state
  const updateDocument = (
    nextDocument: PreparedPuppetDocument,
    nextParameterValues?: PuppetParameterValueMap,
  ) => {
    if (state.destroyed) {
      return false
    }
    assertPreparedPuppetDocument(nextDocument)
    const accepted = state.deferred
      ? renderer.updateDocument(nextDocument, true)
      : renderer.updateDocument(nextDocument)
    if (!accepted) {
      return false
    }
    const physicsChanged = state.document.physics !== nextDocument.physics
    if (state.document.poseGroups !== nextDocument.poseGroups) {
      state.poseState = new Map()
    }
    motionHistory.reset()
    notices.clear()
    state.document = nextDocument
    if (nextParameterValues !== undefined) {
      state.parameterValues = resolveParameterOverrides(state.document, nextParameterValues)
    }
    sounds.load(state.document)
    playbacks.update(state.document.motions)
    playback.update(state.document.motions)
    expressions.update(state.document.expressions ?? [])
    state.expressionLayers.update(state.document.expressions ?? [])
    effects.retain(playbacks.capture().flatMap((entry) => entry.completion ?? []))
    if (physicsChanged) {
      state.physicsState = createPhysicsState(state.document)
      state.chainState = undefined
      syncTicker()
    }
    refresh()
    return true
  }
  return {
    ...createParameterCommands(options),
    ...createEffectCommands(options),
    ...createPlaybackCommands(options),
    configureRenderer: renderer.configure,
    destroy: dispose,
    getRenderingInfo: renderer.getRenderingInfo,
    hitTest(point) {
      if (state.destroyed) {
        return undefined
      }
      return findHitArea({
        document: state.document,
        paintOrder: renderer.getPaintOrder(),
        point: renderer.toDocumentPoint(point),
        vertices: (partId) => renderer.getPartVertices(partId),
      })
    },
    redraw,
    resetPhysics() {
      if (state.destroyed) {
        return
      }
      applyFrame(0, true)
      redraw()
    },
    resize(resolution) {
      if (
        state.destroyed ||
        (resolution !== undefined && (!Number.isFinite(resolution) || resolution <= 0))
      ) {
        return
      }
      renderer.resize(resolution)
    },
    setFit: renderer.setFit,
    setGroupOverride(groupId, override) {
      if (state.destroyed || !getSceneGroupIds(state.document.scene).has(groupId)) {
        return false
      }
      setRenderOverride(state.renderOverrides.groups, groupId, override)
      refresh()
      return true
    },
    setPartOverride(partId, override) {
      if (state.destroyed || !state.document.parts.some((part) => part.id === partId)) {
        return false
      }
      setRenderOverride(state.renderOverrides.parts, partId, override)
      refresh()
      return true
    },
    setViewCamera(camera) {
      if (
        state.destroyed ||
        ![camera.x, camera.y, camera.zoom].every(Number.isFinite) ||
        camera.zoom <= 0
      ) {
        return
      }
      renderer.setViewCamera(camera)
      applyFrame()
      redraw()
    },
    updateDocument,
  }
}
