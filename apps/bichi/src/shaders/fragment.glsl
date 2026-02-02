// Glass/transmission with refraction (background buffer sampling)
// Inspired by pmndrs/drei MeshTransmissionMaterial

uniform float uChromaticAberration;
uniform float uDeepPurple;
uniform float uDistortion;
uniform float uDistortionScale;
uniform float uOpacity;
uniform float uTemporalDistortion;
uniform float uThickness;
uniform float uTime;
uniform sampler2D uBuffer;
uniform vec2 uBufferSize;
uniform float uIOR;
uniform mat4 uProjectionMatrix;

varying float vDistortion;
varying vec3 vNormal;
varying vec3 vWorldPosition;

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// WebGL 1 compatible 3D fractal noise (MeshTransmissionMaterial-style distortion)
float rand(vec3 p) {
  return fract(sin(dot(floor(p), vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float valueNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(mix(rand(i), rand(i + vec3(1.0, 0.0, 0.0)), f.x),
       mix(rand(i + vec3(0.0, 1.0, 0.0)), rand(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(rand(i + vec3(0.0, 0.0, 1.0)), rand(i + vec3(1.0, 0.0, 1.0)), f.x),
       mix(rand(i + vec3(0.0, 1.0, 1.0)), rand(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  return n;
}

float snoiseFractal(vec3 m) {
  return 0.5333333 * valueNoise3D(m)
    + 0.2666667 * valueNoise3D(2.0 * m)
    + 0.1333333 * valueNoise3D(4.0 * m)
    + 0.0666667 * valueNoise3D(8.0 * m);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

  // Refraction: sample background buffer at refracted ray exit point (text bends through glass)
  vec3 refractedRay = refract(-viewDir, normal, 1.0 / uIOR);
  vec3 exitWorldPos = vWorldPosition + refractedRay * (uThickness + 0.1);
  vec4 exitClip = uProjectionMatrix * viewMatrix * vec4(exitWorldPos, 1.0);
  vec2 refractedNDC = clamp((exitClip.xy / exitClip.w) * 0.5 + 0.5, 0.0, 1.0);

  // Distortion offset (noise) so refraction isn't perfectly clean
  vec3 temporalOffset = vec3(uTime, -uTime, -uTime) * uTemporalDistortion;
  vec3 distortionNormal = vec3(0.0);
  if (uDistortion > 0.0) {
    distortionNormal = uDistortion * vec3(
      snoiseFractal(vWorldPosition * uDistortionScale + temporalOffset),
      snoiseFractal(vWorldPosition.zxy * uDistortionScale - temporalOffset),
      snoiseFractal(vWorldPosition.yxz * uDistortionScale + temporalOffset)
    );
  }
  vec2 distortUV = vec2(distortionNormal.x, distortionNormal.y) * 0.05;
  vec2 uvR = refractedNDC + distortUV - uChromaticAberration * 0.02;
  vec2 uvG = refractedNDC + distortUV;
  vec2 uvB = refractedNDC + distortUV + uChromaticAberration * 0.02;

  vec3 refractedColor = vec3(
    texture2D(uBuffer, uvR).r,
    texture2D(uBuffer, uvG).g,
    texture2D(uBuffer, uvB).b
  );

  float height = clamp(vWorldPosition.y * 0.5 + 0.5, 0.0, 1.0);
  float distort = vDistortion * 1.4 + dot(distortionNormal, vec3(0.33));

  vec3 baseA = vec3(0.45, 0.55, 0.75);
  vec3 baseB = vec3(0.35, 0.25, 0.2);
  vec3 baseC = vec3(1.0, 1.0, 1.0);
  vec3 baseD = vec3(0.0, 0.33, 0.67);

  float phaseR = height + distort - uChromaticAberration;
  float phaseG = height + distort;
  float phaseB = height + distort + uChromaticAberration * 1.5;
  float phaseRim = height + fresnel + 0.35;

  vec3 baseR = cosPalette(phaseR, baseA, baseB, baseC, baseD);
  vec3 baseG = cosPalette(phaseG, baseA, baseB, baseC, baseD);
  vec3 baseB_col = cosPalette(phaseB, baseA, baseB, baseC, baseD);
  vec3 base = vec3(baseR.r, baseG.g, baseB_col.b);

  vec3 rimR = cosPalette(phaseRim - uChromaticAberration, baseA, baseB, baseC, baseD);
  vec3 rimG = cosPalette(phaseRim, baseA, baseB, baseC, baseD);
  vec3 rimB_col = cosPalette(phaseRim + uChromaticAberration, baseA, baseB, baseC, baseD);
  vec3 rim = vec3(rimR.r, rimG.g, rimB_col.b);

  vec3 glassColor = mix(base, rim, fresnel);
  vec3 purpleTint = vec3(0.35, 0.1, 0.6) * uDeepPurple;
  glassColor = mix(glassColor, glassColor + purpleTint, 0.35);

  // Mix refracted background (text) with glass tint – transmission strength from fresnel
  float transmission = 0.85 * (1.0 - fresnel);
  vec3 color = mix(glassColor, refractedColor, transmission);

  float thicknessFresnel = fresnel * (1.0 + uThickness);
  float alpha = clamp(uOpacity + thicknessFresnel * 0.5 + vDistortion * 0.25 + length(distortionNormal) * 0.2, 0.0, 0.95);

  gl_FragColor = vec4(color, alpha);
}
