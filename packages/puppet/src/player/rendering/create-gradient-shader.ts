import {type DefaultShader, GlProgram, Shader} from 'pixi.js'

const VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
in vec2 aUV;
in vec4 aColor;
in vec2 aTextureIdAndRound;
in vec4 aUvGradient;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec2 uResolution;
out vec2 vUV;
out vec4 vColor;
flat out float vTextureId;
flat out highp vec4 vUvGradient;
void main() {
  mat3 transform = uProjectionMatrix * uWorldTransformMatrix;
  gl_Position = vec4((transform * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  if (aTextureIdAndRound.x == 1.0) {
    gl_Position.xy = (floor((gl_Position.xy * 0.5 + 0.5) * uResolution + 0.5) / uResolution) * 2.0 - 1.0;
  }
  mat2 screen = mat2(
    vec2(transform[0][0] * uResolution.x * 0.5, transform[0][1] * uResolution.y * 0.5),
    vec2(transform[1][0] * uResolution.x * 0.5, transform[1][1] * uResolution.y * 0.5)
  );
  mat2 gradient = mat2(aUvGradient.xy, aUvGradient.zw) * inverse(screen);
  vUvGradient = vec4(gradient[0], gradient[1]);
  vUV = aUV;
  vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uWorldColorAlpha;
  vTextureId = aTextureIdAndRound.y;
}`

/** Uses each triangle's affine UV derivatives, avoiding cancellation in fragment dFdx/dFdy. */
export const createGradientShader = (source: DefaultShader): Shader => {
  const count = source.maxTextures
  if (count === undefined || count < 1) {
    throw new Error('UV gradients require a batch sampler count')
  }
  const samples = Array.from({length: count}, (_value, index) => {
    const sample = `outColor = textureGrad(uTextures[${index}], vUV, vUvGradient.xy, vUvGradient.zw);`
    return index === count - 1 ? `{ ${sample} }` : `if (vTextureId < ${index}.5) { ${sample} } else`
  }).join('\n')
  const program = new GlProgram({
    fragment: `#version 300 es
precision highp float;
precision lowp sampler2D;
in vec2 vUV;
in vec4 vColor;
flat in float vTextureId;
flat in highp vec4 vUvGradient;
uniform sampler2D uTextures[${count}];
out vec4 finalColor;
void main() {
  vec4 outColor;
  ${samples}
  finalColor = outColor * vColor;
}`,
    name: 'puppet-gradient-batch',
    vertex: VERTEX,
  })
  return new Shader({
    glProgram: program,
    resources: {batchSamplers: source.resources.batchSamplers},
  })
}
