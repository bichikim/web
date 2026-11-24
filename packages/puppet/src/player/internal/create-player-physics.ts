import type {PuppetDocument} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetPhysicsOptions} from '../physics-options'
import type {ChainsState} from '../physics-chain'
import {createPhysicsState, evaluatePhysics} from './physics'
import {releasePhysics} from './release-physics'

/** Owns simulation state and transfers a released interaction pose into that simulation. */
export const createPlayerPhysics = (options: {
  readonly document: () => PuppetDocument
  readonly physicsOptions: () => PuppetPhysicsOptions | undefined
  readonly active: () => boolean
  readonly values: () => PuppetParameterValueMap
  readonly onRelease: (parameterIds: ReadonlyArray<string>) => void
}) => {
  let physicsState = createPhysicsState(options.document())
  let chainState: ChainsState | undefined
  let baseValues: PuppetParameterValueMap = {}
  return {
    evaluate(settings: {
      readonly deltaTime: number
      readonly parameterValues: PuppetParameterValueMap
      readonly settle: boolean
    }) {
      baseValues = settings.parameterValues
      const result = evaluatePhysics({
        ...settings,
        chainState,
        document: options.document(),
        physicsOptions: options.physicsOptions(),
        physicsState,
      })
      ;({chainState, physicsState} = result)
      return result.parameterValues
    },
    release(parameterIds: ReadonlyArray<string>): ReadonlyArray<string> {
      if (!options.active() || chainState === undefined) {
        return []
      }
      const frame = options.values()
      const values = Object.fromEntries(
        parameterIds.flatMap((id) => (frame[id] === undefined ? [] : [[id, frame[id]]])),
      )
      const result = releasePhysics({
        baseValues,
        chainState,
        document: options.document(),
        physicsOptions: options.physicsOptions(),
        physicsState,
        values,
      })
      ;({chainState, physicsState} = result)
      options.onRelease(result.parameterIds)
      return result.parameterIds
    },
    reset() {
      physicsState = createPhysicsState(options.document())
      chainState = undefined
    },
  }
}
