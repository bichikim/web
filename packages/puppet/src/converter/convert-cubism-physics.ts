import type {PuppetPhysics, PuppetPhysicsAxis, PuppetPhysicsRange} from '../player/document'
import {jsonArray, jsonBoolean, jsonNumber, jsonObject, jsonString} from './json-fields'

const PHYSICS_VERSION = 3
const PERCENT = 100
const FRAME_TIME_PHYSICS_FPS = 0

const axis = (value: unknown): PuppetPhysicsAxis => {
  switch (value) {
    case 'X':
      return 'x'
    case 'Y':
      return 'y'
    case 'Angle':
      return 'angle'
    default:
      throw new Error(`Cubism physics axis ${String(value)} is not supported`)
  }
}

const range = (value: unknown): PuppetPhysicsRange => {
  const source = jsonObject(value)
  return {
    center: jsonNumber(source.Default),
    maximum: jsonNumber(source.Maximum),
    minimum: jsonNumber(source.Minimum),
  }
}

/** Cubism physics3 진자 체인을 Poffo 물리 설정으로 변환한다. */
export const convertCubismPhysics = (value: unknown): PuppetPhysics => {
  const source = jsonObject(value)
  if (source.Version !== PHYSICS_VERSION) {
    throw new Error('Cubism physics version must be 3')
  }
  const metadata = jsonObject(source.Meta)
  const forces = jsonObject(metadata.EffectiveForces)
  const gravity = jsonObject(forces.Gravity)
  const wind = jsonObject(forces.Wind)
  return {
    chains: jsonArray(source.PhysicsSettings).map((value) => {
      const setting = jsonObject(value)
      const normalization = jsonObject(setting.Normalization)
      return {
        id: jsonString(setting.Id),
        inputs: jsonArray(setting.Input).map((value) => {
          const input = jsonObject(value)
          const parameter = jsonObject(input.Source)
          if (parameter.Target !== 'Parameter') {
            throw new Error('Cubism physics input must target a parameter')
          }
          return {
            axis: axis(input.Type),
            parameterId: jsonString(parameter.Id),
            reflect: jsonBoolean(input.Reflect),
            weight: jsonNumber(input.Weight) / PERCENT,
          }
        }),
        normalization: {angle: range(normalization.Angle), position: range(normalization.Position)},
        outputs: jsonArray(setting.Output).map((value) => {
          const output = jsonObject(value)
          const parameter = jsonObject(output.Destination)
          if (parameter.Target !== 'Parameter') {
            throw new Error('Cubism physics output must target a parameter')
          }
          return {
            axis: axis(output.Type),
            parameterId: jsonString(parameter.Id),
            pendulumIndex: jsonNumber(output.VertexIndex) - 1,
            reflect: jsonBoolean(output.Reflect),
            scale: jsonNumber(output.Scale),
            weight: jsonNumber(output.Weight) / PERCENT,
          }
        }),
        pendulums: jsonArray(setting.Vertices)
          .slice(1)
          .map((value) => {
            const pendulum = jsonObject(value)
            return {
              acceleration: jsonNumber(pendulum.Acceleration),
              length: jsonNumber(pendulum.Radius),
              mobility: jsonNumber(pendulum.Mobility),
              reaction: jsonNumber(pendulum.Delay),
            }
          }),
      }
    }),
    fps: jsonNumber(metadata.Fps, FRAME_TIME_PHYSICS_FPS),
    gravity: [jsonNumber(gravity.X), -jsonNumber(gravity.Y)],
    pendulums: [],
    wind: [jsonNumber(wind.X), jsonNumber(wind.Y)],
  }
}
