import {COVER_UV} from './cover-uv'
import {FULLSCREEN_VERTEX} from 'src/utils/shader'
import {Filter, GlProgram, type Texture, UniformGroup} from 'pixi.js'
import {DEPTH_PARALLAX_FRAGMENT} from './depth-shader'

/** Viewport-relative x/y and distance from the glass plane. */
export interface VirtualLightPosition {
  readonly x: number
  readonly y: number
  readonly depth: number
}

export interface GlassLightPositions {
  readonly daylight: VirtualLightPosition
  readonly interior: VirtualLightPosition
}

const FRAGMENT = `
in vec2 vUv;
out vec4 finalColor;
uniform sampler2D uBackdrop;
uniform sampler2D uResidue;
uniform sampler2D uReflection;
uniform vec2 uViewportSize;
uniform vec2 uBackdropSize;
uniform vec2 uResidueSize;
uniform vec2 uReflectionSize;
uniform vec3 uDaylightPosition;
uniform vec3 uInteriorPosition;
uniform float uTime;
${DEPTH_PARALLAX_FRAGMENT}

float residueAt(vec2 uv) {
  vec3 residueColor = texture(uResidue, clamp(uv, 0.0, 1.0)).rgb;
  return dot(residueColor, vec3(0.299, 0.587, 0.114));
}

${COVER_UV}

void main() {
  float viewportAspect = uViewportSize.x / uViewportSize.y;
  float mobileAlignment = step(viewportAspect, 0.85);
  vec2 residueUv = coverUv(vUv, uResidueSize, mix(0.5, 0.0, mobileAlignment));
  vec2 reflectionUv = coverUv(vUv, uReflectionSize, mix(0.5, 1.0, mobileAlignment));
  float residueStrength = mix(0.55, 1.0, smoothstep(720.0, 1200.0, uViewportSize.x));
  float compactLandscape = step(1.0, viewportAspect) * (1.0 - smoothstep(720.0, 1200.0, uViewportSize.x));
  residueUv.x += compactLandscape * 0.18;
  float residue = residueAt(residueUv) * residueStrength;
  vec2 texel = 1.0 / uResidueSize;
  vec2 slope = vec2(
    residueAt(residueUv - vec2(texel.x, 0.0)) - residueAt(residueUv + vec2(texel.x, 0.0)),
    residueAt(residueUv - vec2(0.0, texel.y)) - residueAt(residueUv + vec2(0.0, texel.y))
  );
  vec3 normal = normalize(vec3(slope * residueStrength * 3.0, 1.0));

  vec2 sunPosition = uDaylightPosition.xy + vec2(0.025 * sin(uTime * 0.12), 0.0);
  vec2 sunOffset = (sunPosition - vUv) * vec2(viewportAspect, 1.0);
  vec3 sunDirection = normalize(vec3(sunOffset, uDaylightPosition.z));
  float sunFalloff = 1.0 / (1.0 + 7.0 * dot(sunOffset, sunOffset));
  float sunLighting = max(dot(normal, sunDirection), 0.0) * sunFalloff;

  vec2 interiorOffset = (uInteriorPosition.xy - vUv) * vec2(viewportAspect, 1.0);
  vec3 interiorDirection = normalize(vec3(interiorOffset, uInteriorPosition.z));
  float interiorFalloff = 1.0 / (1.0 + 3.5 * dot(interiorOffset, interiorOffset));
  float interiorLighting = max(dot(normal, interiorDirection), 0.0) * interiorFalloff;

  float fresnel = 0.04 + 0.96 * pow(1.0 - max(normal.z, 0.0), 5.0);
  vec2 displacement = normal.xy * residue * 0.004;
  vec2 depthUv = coverUv(vUv, uBackdropSize, 0.5);
  vec2 viewUv = parallaxUv(vUv, depthUv, uViewportSize);
  vec2 backdropUv = coverUv(clamp(viewUv + displacement, 0.0, 1.0), uBackdropSize, 0.5);
  vec3 backdrop = texture(uBackdrop, backdropUv).rgb;
  vec3 reflection = pow(texture(uReflection, reflectionUv).rgb, vec3(0.7));
  float roomRadiance = 0.6 + interiorLighting * 1.6;
  float reflectionAmount = fresnel * 8.0 * roomRadiance + residue * interiorLighting * 0.08;
  vec3 color = 1.0 - (1.0 - backdrop) * (1.0 - reflection * reflectionAmount);
  color += vec3(1.0, 0.75, 0.44) * (residue * sunLighting * 0.6 + sunFalloff * 0.035);
  finalColor = vec4(min(color, 1.0), 1.0);
}
`

interface GlassUniforms {
  readonly uDaylightPosition: Float32Array
  readonly uParallaxPixels: Float32Array
  readonly uViewportSize: Float32Array
  uTime: number
}

interface GlassLightTextures {
  readonly backdrop: Texture
  readonly depth: Texture
  readonly residue: Texture
  readonly reflection: Texture
}

/** Composites a replaceable view through lit, imperfect glass. */
export class GlassLightFilter extends Filter {
  readonly #uniforms: GlassUniforms

  constructor(
    {backdrop, depth, residue, reflection}: GlassLightTextures,
    positions: GlassLightPositions,
  ) {
    const uniforms = new UniformGroup({
      uBackdropSize: {
        type: 'vec2<f32>',
        value: new Float32Array([backdrop.width, backdrop.height]),
      },
      uDaylightPosition: {
        type: 'vec3<f32>',
        value: new Float32Array([
          positions.daylight.x,
          positions.daylight.y,
          positions.daylight.depth,
        ]),
      },
      uInteriorPosition: {
        type: 'vec3<f32>',
        value: new Float32Array([
          positions.interior.x,
          positions.interior.y,
          positions.interior.depth,
        ]),
      },
      uParallaxPixels: {type: 'vec2<f32>', value: new Float32Array([0, 0])},
      uReflectionSize: {
        type: 'vec2<f32>',
        value: new Float32Array([reflection.width, reflection.height]),
      },
      uResidueSize: {type: 'vec2<f32>', value: new Float32Array([residue.width, residue.height])},
      uTime: {type: 'f32', value: 0},
      uViewportSize: {type: 'vec2<f32>', value: new Float32Array([1, 1])},
    })

    super({
      glProgram: GlProgram.from({
        fragment: FRAGMENT,
        name: 'relax-glass-light',
        vertex: FULLSCREEN_VERTEX,
      }),
      resources: {
        glassUniforms: uniforms,
        uBackdrop: backdrop.source,
        uBackdropSampler: backdrop.source.style,
        uDepthTexture: depth.source,
        uDepthTextureSampler: depth.source.style,
        uReflection: reflection.source,
        uReflectionSampler: reflection.source.style,
        uResidue: residue.source,
        uResidueSampler: residue.source.style,
      },
    })
    this.#uniforms = uniforms.uniforms as GlassUniforms
  }

  setViewport(width: number, height: number) {
    this.#uniforms.uViewportSize[0] = width
    this.#uniforms.uViewportSize[1] = height
  }

  setDaylightPosition(position: VirtualLightPosition) {
    this.#uniforms.uDaylightPosition[0] = position.x
    this.#uniforms.uDaylightPosition[1] = position.y
    this.#uniforms.uDaylightPosition[2] = position.depth
  }

  setParallaxOffset(x: number, y: number) {
    this.#uniforms.uParallaxPixels[0] = x
    this.#uniforms.uParallaxPixels[1] = y
  }

  setTime(time: number) {
    this.#uniforms.uTime = time
  }
}
