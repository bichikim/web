struct Draw { camera:vec4<f32>, multiply:vec4<f32>, screen:vec4<f32>, flags:vec4<f32>, clip_rect:vec4<f32>, target_origin:vec4<f32> };
@group(0) @binding(0) var<uniform> draw:Draw;
@group(1) @binding(0) var atlas:texture_2d<f32>;
@group(1) @binding(1) var atlas_sampler:sampler;
@group(2) @binding(0) var clip:texture_2d<f32>;
@group(2) @binding(1) var clip_sampler:sampler;
struct Vertex { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> };
@vertex fn vertex(@location(0) position:vec2<f32>,@location(1) uv:vec2<f32>)->Vertex {
 var result:Vertex;result.position=vec4<f32>(position*draw.camera.xy+draw.camera.zw,0.,1.);result.uv=uv;return result;
}
@fragment fn fragment(input:Vertex)->@location(0) vec4<f32> {
 let color=textureSample(atlas,atlas_sampler,input.uv);
 let rgb=color.rgb*draw.multiply.rgb*(vec3<f32>(1.)-draw.screen.rgb)+draw.screen.rgb*color.a;
 var weight=draw.multiply.a;
 if(draw.flags.x>0.5){
  let uv=(input.position.xy+draw.target_origin.xy-draw.clip_rect.xy)/draw.clip_rect.zw;
  let sampled=textureSample(clip,clip_sampler,uv).a;
  let alpha=select(0.,sampled,all(uv>=vec2<f32>(0.))&&all(uv<vec2<f32>(1.)));
  weight*=select(alpha,1.-alpha,draw.flags.y>0.5);
 }
 return vec4<f32>(rgb,color.a)*weight;
}
