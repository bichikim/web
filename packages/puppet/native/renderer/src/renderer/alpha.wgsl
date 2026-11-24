struct Size {
    width: u32,
    height: u32,
}

@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linear: sampler;
@group(0) @binding(2) var<storage, read_write> pixels: array<u32>;
@group(0) @binding(3) var<uniform> size: Size;

@compute @workgroup_size(8, 8)
fn sample_alpha(@builtin(global_invocation_id) point: vec3<u32>) {
    if (point.x >= size.width || point.y >= size.height) {
        return;
    }
    let uv = (vec2<f32>(point.xy) + vec2<f32>(0.5)) / vec2<f32>(f32(size.width), f32(size.height));
    let alpha = textureSampleLevel(source, linear, uv, 0.0).a;
    pixels[point.y * size.width + point.x] = u32(round(alpha * 255.0));
}
