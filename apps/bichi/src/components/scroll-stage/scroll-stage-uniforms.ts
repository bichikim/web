import * as THREE from 'three'
import {lerp} from './scroll-stage-math'
import {EASE_MULTIPLIER, SETTINGS, type UniformKey} from './scroll-stage-settings'

export interface UniformAnimator {
  update: (normalized: number) => void
  values: UniformValues
}

export interface UniformValues extends Record<UniformKey, number> {}

export interface TimeUniform {
  value: number
}

export function createMaterialUniforms(): Record<UniformKey, THREE.IUniform<number>> & {uTime: TimeUniform} {
  const uniforms = {} as Record<UniformKey, THREE.IUniform<number>>

  for (const key of Object.keys(SETTINGS) as UniformKey[]) {
    uniforms[key] = {value: SETTINGS[key].start}
  }

  return {...uniforms, uTime: {value: 0}}
}

export function createUniformValues(): UniformValues {
  const values = {} as UniformValues

  for (const key of Object.keys(SETTINGS) as UniformKey[]) {
    values[key] = SETTINGS[key].start
  }

  return values
}

export function createUniformAnimator(material: THREE.ShaderMaterial, ease: number): UniformAnimator {
  const values = createUniformValues()

  const update = (normalized: number) => {
    for (const key of Object.keys(SETTINGS) as UniformKey[]) {
      const setting = SETTINGS[key]
      const target = setting.start + normalized * (setting.end - setting.start)

      values[key] = lerp(values[key], target, ease * EASE_MULTIPLIER)
      material.uniforms[key].value = values[key]
    }
  }

  return {update, values}
}
