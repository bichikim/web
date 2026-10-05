import {COVER_UV} from './cover-uv'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'

import {FULLSCREEN_VERTEX} from 'src/utils/fullscreen-vertex'
import {DEPTH_PARALLAX_FRAGMENT} from './depth-shader'

const FRAGMENT = `
in vec2 vUv;
out vec4 finalColor;
uniform sampler2D uBackdrop;
uniform sampler2D uMistBackdrop;
uniform sampler2D uRainMap;
uniform sampler2D uDropletMap;
uniform sampler2D uMistMap;
uniform vec2 uBackdropSize;
uniform float uMistIntensity;
uniform vec2 uViewportSize;
${DEPTH_PARALLAX_FRAGMENT}

${COVER_UV}

vec3 backgroundAt(vec2 uv) {
  vec2 depthUv = coverUv(clamp(uv, 0.0, 1.0), uBackdropSize, 0.5);
  return texture(uBackdrop, coverUv(parallaxUv(uv, depthUv, uViewportSize), uBackdropSize, 0.5)).rgb;
}

vec3 mistedBackground(vec2 uv, float mist) {
  vec2 depthUv = coverUv(clamp(uv, 0.0, 1.0), uBackdropSize, 0.5);
  vec3 softened = texture(uMistBackdrop, coverUv(parallaxUv(uv, depthUv, uViewportSize), uBackdropSize, 0.5)).rgb;
  return mix(backgroundAt(uv), softened + vec3(0.01), mist);
}

vec3 refractedBackground(vec2 uv) {
  vec2 pixel = vec2(12.0) / uViewportSize;
  vec3 softened = backgroundAt(uv);
  softened += backgroundAt(uv + vec2(pixel.x, 0.0));
  softened += backgroundAt(uv - vec2(pixel.x, 0.0));
  softened += backgroundAt(uv + vec2(0.0, pixel.y));
  softened += backgroundAt(uv - vec2(0.0, pixel.y));
  return softened * 0.2;
}

void main() {
  vec4 rain = texture(uRainMap, vUv);
  vec4 tiny = texture(uDropletMap, vUv);
  float mist = texture(uMistMap, vUv).r * uMistIntensity;
  vec3 composed = rain.rgb + tiny.rgb - 2.0 * rain.rgb * tiny.rgb;
  float alpha = max(rain.a, tiny.a);
  float mask = smoothstep(0.96, 0.99, alpha);
  float size = rain.a > tiny.a ? 0.8 : 0.2;
  vec2 displacement = (composed.rg - vec2(0.5)) * (0.4 + 0.6 * size);
  vec3 refracted = refractedBackground(vUv - displacement);
  vec3 normal = normalize(vec3((composed.rg - vec2(0.5)) * 2.0, 1.0));
  vec3 light = normalize(vec3(-1.0, 1.0, 2.0));
  float diffuse = max(dot(light, normal), 0.0);
  vec3 dropletColor = refracted + vec3((diffuse - 0.8) * 0.2);
  finalColor = vec4(mix(mistedBackground(vUv, mist), dropletColor, mask), 1.0);
}
`

interface RainUniforms {
  uMistIntensity: number
  readonly uParallaxPixels: Float32Array
  readonly uViewportSize: Float32Array
}

interface RainGlassTextures {
  readonly backdrop: Texture
  readonly depth: Texture
  readonly mistBackdrop: Texture
  readonly rainMap: Texture
  readonly dropletMap: Texture
  readonly mistMap: Texture
}

/** Composes moving drops, accumulated beads, and condensation over the background. */
export class RainGlassFilter extends Filter {
  readonly #uniforms: RainUniforms

  constructor({backdrop, depth, mistBackdrop, rainMap, dropletMap, mistMap}: RainGlassTextures) {
    const uniforms = new UniformGroup({
      uBackdropSize: {
        type: 'vec2<f32>',
        value: new Float32Array([backdrop.width, backdrop.height]),
      },
      uMistIntensity: {type: 'f32', value: 1},
      uParallaxPixels: {type: 'vec2<f32>', value: new Float32Array([0, 0])},
      uViewportSize: {type: 'vec2<f32>', value: new Float32Array([1, 1])},
    })
    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'relax-rain-glass',
        vertex: FULLSCREEN_VERTEX,
      }),
      resources: {
        rainUniforms: uniforms,
        uBackdrop: backdrop.source,
        uBackdropSampler: backdrop.source.style,
        uDepthTexture: depth.source,
        uDepthTextureSampler: depth.source.style,
        uDropletMap: dropletMap.source,
        uDropletMapSampler: dropletMap.source.style,
        uMistBackdrop: mistBackdrop.source,
        uMistBackdropSampler: mistBackdrop.source.style,
        uMistMap: mistMap.source,
        uMistMapSampler: mistMap.source.style,
        uRainMap: rainMap.source,
        uRainMapSampler: rainMap.source.style,
      },
    })
    this.#uniforms = uniforms.uniforms as RainUniforms
  }

  setViewport(width: number, height: number) {
    this.#uniforms.uViewportSize[0] = width
    this.#uniforms.uViewportSize[1] = height
  }

  setMistIntensity(intensity: number) {
    this.#uniforms.uMistIntensity = intensity
  }

  setParallaxOffset(x: number, y: number) {
    this.#uniforms.uParallaxPixels[0] = x
    this.#uniforms.uParallaxPixels[1] = y
  }
}
