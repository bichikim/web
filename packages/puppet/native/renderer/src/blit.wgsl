@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var image_sampler:sampler;
struct Vertex { @builtin(position) position:vec4<f32>,@location(0) uv:vec2<f32> };
@vertex fn vertex(@builtin(vertex_index) index:u32)->Vertex {
 let positions=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));var result:Vertex;let position=positions[index];result.position=vec4<f32>(position,0.,1.);result.uv=vec2<f32>((position.x+1.)*.5,(1.-position.y)*.5);return result;
}
@fragment fn fragment(input:Vertex)->@location(0) vec4<f32>{return textureSample(image,image_sampler,input.uv);}
