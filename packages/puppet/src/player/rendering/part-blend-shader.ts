/**
 * Backdrop blending shared by the WebGL and WebGPU programs: W3C Compositing and Blending
 * Level 1 color functions on unpremultiplied colors, combined with the
 * `KHR_blend_equation_advanced` overlap model for alpha compositing. `out` follows Cubism's
 * definition (the backdrop times the part's inverse alpha), i.e. destination-out.
 *
 * Blend and alpha mode numbers are indices into `PUPPET_PART_BLEND_MODES` and
 * `PUPPET_ALPHA_BLEND_MODES`. The Rust renderer's `blend.wgsl` mirrors these formulas.
 */

export const PART_BLEND_GLSL = `
uniform float uBlendMode;
uniform float uAlphaMode;

float colorDodge(float cb, float cs) {
  if (cb <= 0.0) return 0.0;
  if (cs >= 1.0) return 1.0;
  return min(1.0, cb / (1.0 - cs));
}

float colorBurn(float cb, float cs) {
  if (cb >= 1.0) return 1.0;
  if (cs <= 0.0) return 0.0;
  return 1.0 - min(1.0, (1.0 - cb) / cs);
}

float hardLight(float cb, float cs) {
  float s = 2.0 * cs;
  return cs <= 0.5 ? cb * s : cb + (s - 1.0) - cb * (s - 1.0);
}

float softLight(float cb, float cs) {
  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);
  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);
  return cb + (2.0 * cs - 1.0) * (d - cb);
}

float separable(float cb, float cs, int mode) {
  if (mode == 2) return cb * cs;
  if (mode == 3) return cb + cs - cb * cs;
  if (mode == 4) return min(cb, cs);
  if (mode == 5) return max(cb, cs);
  if (mode == 6) return colorBurn(cb, cs);
  if (mode == 7) return max(0.0, cb + cs - 1.0);
  if (mode == 8) return colorDodge(cb, cs);
  if (mode == 1 || mode == 9) return min(1.0, cb + cs);
  if (mode == 20) return cb + cs;
  if (mode == 10) return hardLight(cs, cb);
  if (mode == 11) return softLight(cb, cs);
  if (mode == 12) return hardLight(cb, cs);
  if (mode == 13) return clamp(cb + 2.0 * cs - 1.0, 0.0, 1.0);
  if (mode == 14) return abs(cb - cs);
  if (mode == 15) return cb + cs - 2.0 * cb * cs;
  return cs;
}

float lum(vec3 c) {
  return dot(c, vec3(0.3, 0.59, 0.11));
}

vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / (l - n);
  if (x > 1.0 && x > l) c = l + (c - l) * (1.0 - l) / (x - l);
  return c;
}

vec3 setLum(vec3 c, float l) {
  return clipColor(c + (l - lum(c)));
}

float sat(vec3 c) {
  return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
}

vec3 setSat(vec3 c, float s) {
  float x = max(max(c.r, c.g), c.b);
  float n = min(min(c.r, c.g), c.b);
  return x > n ? (c - n) * s / (x - n) : vec3(0.0);
}

vec3 blendColor(vec3 cb, vec3 cs, int mode) {
  if (mode == 16) return setLum(setSat(cs, sat(cb)), lum(cb));
  if (mode == 17) return setLum(setSat(cb, sat(cs)), lum(cb));
  if (mode == 18) return setLum(cs, lum(cb));
  if (mode == 19) return setLum(cb, lum(cs));
  return vec3(separable(cb.r, cs.r, mode), separable(cb.g, cs.g, mode), separable(cb.b, cs.b, mode));
}

vec4 compositePart(vec4 front, vec4 back) {
  float as = front.a;
  float ab = back.a;
  vec3 cs = as > 0.0 ? front.rgb / as : vec3(0.0);
  vec3 cb = ab > 0.0 ? back.rgb / ab : vec3(0.0);
  int blendMode = int(uBlendMode + 0.5);
  // Add (Glow) keeps the overflow, which the alpha terms then scale.
  vec3 f = blendMode == 20
    ? blendColor(cb, cs, blendMode)
    : clamp(blendColor(cb, cs, blendMode), 0.0, 1.0);
  int alphaMode = int(uAlphaMode + 0.5);
  float p0 = as * ab;
  float p1 = as * (1.0 - ab);
  float p2 = ab * (1.0 - as);
  if (alphaMode == 3) {
    p0 = min(as, ab);
    p1 = max(as - ab, 0.0);
    p2 = max(ab - as, 0.0);
  } else if (alphaMode == 4) {
    p0 = max(as + ab - 1.0, 0.0);
    p1 = min(as, 1.0 - ab);
    p2 = min(ab, 1.0 - as);
  }
  vec3 weights = alphaMode == 1 ? vec3(1.0, 0.0, 1.0) : alphaMode == 2 ? vec3(0.0, 0.0, 1.0) : vec3(1.0);
  vec3 color = weights.x * f * p0 + weights.y * cs * p1 + weights.z * cb * p2;
  return vec4(color, weights.x * p0 + weights.y * p1 + weights.z * p2);
}
`

export const PART_BLEND_WGSL = `
struct PuppetBlendUniforms {
  uBlendMode: f32,
  uAlphaMode: f32,
};

@group(1) @binding(0) var<uniform> blendUniforms: PuppetBlendUniforms;

fn colorDodge(cb: f32, cs: f32) -> f32 {
  if (cb <= 0.0) { return 0.0; }
  if (cs >= 1.0) { return 1.0; }
  return min(1.0, cb / (1.0 - cs));
}

fn colorBurn(cb: f32, cs: f32) -> f32 {
  if (cb >= 1.0) { return 1.0; }
  if (cs <= 0.0) { return 0.0; }
  return 1.0 - min(1.0, (1.0 - cb) / cs);
}

fn hardLight(cb: f32, cs: f32) -> f32 {
  let s = 2.0 * cs;
  return select(cb + (s - 1.0) - cb * (s - 1.0), cb * s, cs <= 0.5);
}

fn softLight(cb: f32, cs: f32) -> f32 {
  if (cs <= 0.5) { return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb); }
  let d = select(sqrt(cb), ((16.0 * cb - 12.0) * cb + 4.0) * cb, cb <= 0.25);
  return cb + (2.0 * cs - 1.0) * (d - cb);
}

fn separable(cb: f32, cs: f32, mode: i32) -> f32 {
  switch mode {
    case 2: { return cb * cs; }
    case 3: { return cb + cs - cb * cs; }
    case 4: { return min(cb, cs); }
    case 5: { return max(cb, cs); }
    case 6: { return colorBurn(cb, cs); }
    case 7: { return max(0.0, cb + cs - 1.0); }
    case 8: { return colorDodge(cb, cs); }
    case 1, 9: { return min(1.0, cb + cs); }
    case 20: { return cb + cs; }
    case 10: { return hardLight(cs, cb); }
    case 11: { return softLight(cb, cs); }
    case 12: { return hardLight(cb, cs); }
    case 13: { return clamp(cb + 2.0 * cs - 1.0, 0.0, 1.0); }
    case 14: { return abs(cb - cs); }
    case 15: { return cb + cs - 2.0 * cb * cs; }
    default: { return cs; }
  }
}

fn lum(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.3, 0.59, 0.11));
}

fn clipColor(input: vec3<f32>) -> vec3<f32> {
  var c = input;
  let l = lum(c);
  let n = min(min(c.r, c.g), c.b);
  let x = max(max(c.r, c.g), c.b);
  if (n < 0.0) { c = l + (c - l) * l / (l - n); }
  if (x > 1.0 && x > l) { c = l + (c - l) * (1.0 - l) / (x - l); }
  return c;
}

fn setLum(c: vec3<f32>, l: f32) -> vec3<f32> {
  return clipColor(c + (l - lum(c)));
}

fn sat(c: vec3<f32>) -> f32 {
  return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
}

fn setSat(c: vec3<f32>, s: f32) -> vec3<f32> {
  let x = max(max(c.r, c.g), c.b);
  let n = min(min(c.r, c.g), c.b);
  if (x > n) { return (c - n) * s / (x - n); }
  return vec3<f32>(0.0);
}

fn blendColor(cb: vec3<f32>, cs: vec3<f32>, mode: i32) -> vec3<f32> {
  switch mode {
    case 16: { return setLum(setSat(cs, sat(cb)), lum(cb)); }
    case 17: { return setLum(setSat(cb, sat(cs)), lum(cb)); }
    case 18: { return setLum(cs, lum(cb)); }
    case 19: { return setLum(cb, lum(cs)); }
    default: {
      return vec3<f32>(separable(cb.r, cs.r, mode), separable(cb.g, cs.g, mode), separable(cb.b, cs.b, mode));
    }
  }
}

fn compositePart(front: vec4<f32>, back: vec4<f32>, blendMode: i32, alphaMode: i32) -> vec4<f32> {
  let as_ = front.a;
  let ab = back.a;
  let cs = select(vec3<f32>(0.0), front.rgb / as_, as_ > 0.0);
  let cb = select(vec3<f32>(0.0), back.rgb / ab, ab > 0.0);
  // Add (Glow) keeps the overflow, which the alpha terms then scale.
  var f = blendColor(cb, cs, blendMode);
  if (blendMode != 20) { f = clamp(f, vec3<f32>(0.0), vec3<f32>(1.0)); }
  var p0 = as_ * ab;
  var p1 = as_ * (1.0 - ab);
  var p2 = ab * (1.0 - as_);
  if (alphaMode == 3) {
    p0 = min(as_, ab);
    p1 = max(as_ - ab, 0.0);
    p2 = max(ab - as_, 0.0);
  } else if (alphaMode == 4) {
    p0 = max(as_ + ab - 1.0, 0.0);
    p1 = min(as_, 1.0 - ab);
    p2 = min(ab, 1.0 - as_);
  }
  var weights = vec3<f32>(1.0);
  if (alphaMode == 1) { weights = vec3<f32>(1.0, 0.0, 1.0); }
  if (alphaMode == 2) { weights = vec3<f32>(0.0, 0.0, 1.0); }
  let color = weights.x * f * p0 + weights.y * cs * p1 + weights.z * cb * p2;
  return vec4<f32>(color, weights.x * p0 + weights.y * p1 + weights.z * p2);
}
`
