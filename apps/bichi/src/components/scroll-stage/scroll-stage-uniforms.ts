import * as THREE from 'three'

import {lerp} from './scroll-stage-math'
import {EASE_MULTIPLIER, SETTINGS, type UniformKey} from './scroll-stage-settings'

export interface UniformAnimator {
  update: (normalized: number) => void
  values: UniformValues
}

export interface UniformValues extends Record<UniformKey, number> {}

export function createMaterialUniforms(): Record<UniformKey, THREE.IUniform<number>> {
  return {
    uAmplitude: {value: SETTINGS.uAmplitude.start},
    uDeepPurple: {value: SETTINGS.uDeepPurple.start},
    uDensity: {value: SETTINGS.uDensity.start},
    uFrequency: {value: SETTINGS.uFrequency.start},
    uOpacity: {value: SETTINGS.uOpacity.start},
    uStrength: {value: SETTINGS.uStrength.start},
  }
}

export function createUniformValues(): UniformValues {
  return {
    uAmplitude: SETTINGS.uAmplitude.start,
    uDeepPurple: SETTINGS.uDeepPurple.start,
    uDensity: SETTINGS.uDensity.start,
    uFrequency: SETTINGS.uFrequency.start,
    uOpacity: SETTINGS.uOpacity.start,
    uStrength: SETTINGS.uStrength.start,
  }
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
