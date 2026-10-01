import {FULLSCREEN_VERTEX} from 'src/utils/fullscreen-vertex'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

export type ShaderEffect = 'directional-wipe' | 'cross-warp' | 'circle-open' | 'rgb-kinetic'
export interface ScreenEffectOptions {
  readonly effect: ShaderEffect
  readonly from: Texture
  readonly to: Texture
}

// Adapted from GL Transitions: gre (directionalwipe, circleopen),
// Eke Péter (crosswarp).
// RGB kinetic is an original shader inspired by hmongouachon/rgbKineticSlider.
// MIT license and source links: public/licenses/gl-transitions.txt.
const FRAGMENT = `
in vec2 vUv;
out vec4 finalColor;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform float uEffect;
uniform float uRatio;
vec4 kineticColor(sampler2D image, vec2 uv, vec2 split) {
  vec4 center = texture(image, clamp(uv, 0.0, 1.0));
  float red = texture(image, clamp(uv + split, 0.0, 1.0)).r;
  float blue = texture(image, clamp(uv - split, 0.0, 1.0)).b;
  return vec4(red, center.g, blue, center.a);
}
void main() {
  vec2 p = vUv;
  if (uProgress <= 0.0) {
    finalColor = texture(uFrom, p);
  } else if (uProgress >= 1.0) {
    finalColor = texture(uTo, p);
  } else if (uEffect > 2.5) {
    float pulse = sin(uProgress * 3.14159265);
    float sweep = smoothstep(0.0, 1.0, uProgress);
    vec2 centered = p - 0.5;
    vec2 drift = vec2(sin(p.y * 7.0 + uProgress * 5.0), cos(p.x * 5.0 - uProgress * 4.0));
    vec2 bend = drift * vec2(0.045 / uRatio, 0.018) * pulse;
    vec2 split = vec2(0.014 / uRatio, 0.003) * pulse;
    vec2 outgoing = centered / (1.0 + pulse * 0.12) + 0.5 + bend;
    vec2 incoming = centered / (1.0 + pulse * 0.08) + 0.5 - bend;
    finalColor = mix(kineticColor(uFrom, outgoing, split), kineticColor(uTo, incoming, -split), sweep);
  } else if (uEffect > 1.5) {
    float distance = length((p - 0.5) * vec2(uRatio, 1.0));
    float normalized = distance / (0.5 * length(vec2(uRatio, 1.0)));
    float amount = 1.0 - smoothstep(-0.3, 0.0, normalized - uProgress * 1.3);
    finalColor = mix(texture(uFrom, p), texture(uTo, p), amount);
  } else if (uEffect > 0.5) {
    float amount = smoothstep(0.0, 1.0, uProgress * 2.0 + p.x - 1.0);
    finalColor = mix(
      texture(uFrom, (p - 0.5) * (1.0 - amount) + 0.5),
      texture(uTo, (p - 0.5) * amount + 0.5),
      amount
    );
  } else {
    float amount = 1.0 - smoothstep(-0.5, 0.0, p.x - uProgress * 1.5);
    finalColor = mix(texture(uFrom, p), texture(uTo, p), amount);
  }
}
`

/** Borrows two complete screen textures for a GL Transitions effect. */
export class ScreenEffect extends Filter {
  readonly #progress: {uProgress: number}

  constructor(options: ScreenEffectOptions) {
    const uniforms = new UniformGroup({
      uEffect: {
        type: 'f32',
        value: ['directional-wipe', 'cross-warp', 'circle-open', 'rgb-kinetic'].indexOf(
          options.effect,
        ),
      },
      uProgress: {type: 'f32', value: 0},
      uRatio: {type: 'f32', value: options.to.width / options.to.height},
    })
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'album-transition',
        vertex: FULLSCREEN_VERTEX,
      }),
      resources: {
        transitionUniforms: uniforms,
        uFrom: options.from.source,
        uFromSampler: options.from.source.style,
        uTo: options.to.source,
        uToSampler: options.to.source.style,
      },
    })
    this.#progress = uniforms.uniforms
  }

  setProgress(progress: number) {
    this.#progress.uProgress = progress
  }
}
