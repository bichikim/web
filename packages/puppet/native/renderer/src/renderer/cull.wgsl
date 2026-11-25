@group(0) @binding(0) var<storage, read> positions: array<vec2u>;
@group(0) @binding(1) var<storage, read> authored: array<u32>;
@group(0) @binding(2) var<storage, read> active_parts: array<u32>;
@group(0) @binding(3) var<storage, read_write> indices: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let start = id.x * 5u;
    if (start >= arrayLength(&authored)) { return; }
    let a = authored[start];
    let b = authored[start + 1u];
    let c = authored[start + 2u];
    let rest = bitcast<i32>(authored[start + 3u]);
    let part = authored[start + 4u];
    var flip = false;
    if (rest != 0 && active_parts[part] != 0u) {
        flip = winding_sign(positions[a], positions[b], positions[c]) * rest < 0;
    }
    let offset = id.x * 3u;
    indices[offset] = a;
    indices[offset + 1u] = select(b, a, flip);
    indices[offset + 2u] = select(c, a, flip);
}
