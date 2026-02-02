import {describe, expect, it} from 'vitest'
import type {ShaderMaterial} from 'three'
import {createMaterialUniforms, createUniformAnimator, createUniformValues} from '../scroll-stage-uniforms'

describe('scroll-stage-uniforms', () => {
  it('creates uniform values from defaults', () => {
    const values = createUniformValues()

    expect(values.uAmplitude).toBe(4)
    expect(values.uDeepPurple).toBe(0.2)
    expect(values.uDensity).toBe(1)
    expect(values.uFrequency).toBe(0)
    expect(values.uOpacity).toBe(0.35)
    expect(values.uStrength).toBe(0.15)
    expect(values.uChromaticAberration).toBe(0.02)
    expect(values.uThickness).toBe(0.15)
  })

  it('creates material uniforms with default values', () => {
    const uniforms = createMaterialUniforms()

    expect(uniforms.uAmplitude.value).toBe(4)
    expect(uniforms.uDeepPurple.value).toBe(0.2)
    expect(uniforms.uDensity.value).toBe(1)
    expect(uniforms.uFrequency.value).toBe(0)
    expect(uniforms.uOpacity.value).toBe(0.35)
    expect(uniforms.uStrength.value).toBe(0.15)
    expect(uniforms.uTime.value).toBe(0)
  })

  it('animates uniforms toward target values', () => {
    const material = {
      uniforms: createMaterialUniforms(),
    } as unknown as ShaderMaterial
    const animator = createUniformAnimator(material, 0.5)

    animator.update(1)
    expect(animator.values.uFrequency).toBe(4)
    expect(animator.values.uDeepPurple).toBe(0.6)
    expect(animator.values.uOpacity).toBe(0.8)
    expect(animator.values.uStrength).toBe(0.9)
    expect(material.uniforms.uFrequency.value).toBe(4)
    expect(material.uniforms.uOpacity.value).toBe(0.8)
  })
})
