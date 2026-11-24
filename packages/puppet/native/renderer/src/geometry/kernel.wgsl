struct Scalar { value: vec2f, error: f32 };
@group(0) @binding(0) var<storage,read_write> vertices: array<vec2f>;
@group(0) @binding(1) var<storage,read> jobs: array<vec4u>;
@group(0) @binding(2) var<storage,read> constants: array<vec4f>;
struct Corrections {
 count:atomic<u32>,
 indices:array<u32,1024>,
 packed:array<vec2f>,
};
@group(0) @binding(4) var<storage,read_write> corrections:Corrections;
var<private> uncertain:bool;
fn scalar(value:f32)->Scalar {return Scalar(vec2f(value,0.0),0.0);}
fn parameter(index:u32)->Scalar {let v=constants[index];return Scalar(v.xy,v.z);}
fn add(a:Scalar,b:Scalar)->Scalar {
 let value=sum_fp64(a.value,b.value);
 let error=a.error+b.error+(abs(a.value.x)+abs(b.value.x)+abs(value.x))*2.2737367544323206e-13;
 return Scalar(value,error);
}
fn subtract(a:Scalar,b:Scalar)->Scalar {
 let value=sub_fp64(a.value,b.value);
 let error=a.error+b.error+(abs(a.value.x)+abs(b.value.x)+abs(value.x))*2.2737367544323206e-13;
 return Scalar(value,error);
}
fn multiply(a:Scalar,b:Scalar)->Scalar {
 let value=mul_fp64(a.value,b.value);
 let error=abs(a.value.x)*b.error+abs(b.value.x)*a.error+a.error*b.error+abs(value.x)*2.2737367544323206e-13;
 return Scalar(value,error);
}
fn divide(a:Scalar,b:Scalar)->Scalar {
 let value=div_fp64(a.value,b.value);
 let error=(a.error+abs(value.x)*b.error)/abs(b.value.x)+abs(value.x)*9.094947017729282e-13;
 return Scalar(value,error);
}
fn lessEqual(a:Scalar,b:Scalar)->bool {
 let difference=subtract(a,b);
 if(abs(difference.value.x)<=difference.error*4.0) {uncertain=true;}
 return difference.value.x<0.0 || (difference.value.x==0.0 && difference.value.y<=0.0);
}
fn lerpOne(point:Scalar,mapped:Scalar)->Scalar {return add(point,subtract(mapped,point));}
fn boneAxis(axis:u32,x:Scalar,y:Scalar,base:u32)->Scalar {
 if(axis==0u) {return subtract(add(parameter(base+2u),multiply(x,parameter(base+4u))),multiply(y,parameter(base+5u)));}
 return add(add(parameter(base+3u),multiply(x,parameter(base+5u))),multiply(y,parameter(base+4u)));
}
fn rotatePoint(point:vec2f,base:u32)->array<Scalar,2> {
 let px=scalar(point.x);let py=scalar(point.y);
 let x=multiply(subtract(px,parameter(base)),parameter(base+6u));
 let y=multiply(subtract(py,parameter(base+1u)),parameter(base+7u));
 let mx=lerpOne(px,lerpOne(px,boneAxis(0u,x,y,base)));
 let my=lerpOne(py,lerpOne(py,boneAxis(1u,x,y,base)));
 let lx=subtract(mx,parameter(base+8u));let ly=subtract(my,parameter(base+9u));
 return array<Scalar,2>(
  subtract(add(parameter(base+10u),multiply(lx,parameter(base+12u))),multiply(ly,parameter(base+13u))),
  add(add(parameter(base+11u),multiply(lx,parameter(base+13u))),multiply(ly,parameter(base+12u)))
 );
}
fn affinePoint(point:vec2f,base:u32)->array<Scalar,2> {
 let x=scalar(point.x);let y=scalar(point.y);
 var result=array<Scalar,2>(
  add(add(multiply(x,parameter(base)),multiply(y,parameter(base+1u))),parameter(base+2u)),
  add(add(multiply(x,parameter(base+3u)),multiply(y,parameter(base+4u))),parameter(base+5u))
 );
 let envelope=abs(parameter(base+6u).value.x)+(abs(point.x)+abs(point.y))*abs(parameter(base+7u).value.x);
 result[0].error+=envelope;result[1].error+=envelope;
 return result;
}
fn gridAxis(axis:u32,kind:u32,base:u32,x:Scalar,y:Scalar)->Scalar {
 let a=parameter(base+4u+axis);let b=parameter(base+6u+axis);
 let c=parameter(base+8u+axis);let d=parameter(base+10u+axis);
 let one=scalar(1.0);
 if(kind==2u) {
  return add(add(add(
   multiply(multiply(a,subtract(one,x)),subtract(one,y)),
   multiply(multiply(b,x),subtract(one,y))),
   multiply(multiply(c,subtract(one,x)),y)),multiply(multiply(d,x),y));
 }
 if(kind==3u) {
  if(lessEqual(add(x,y),one)) {return add(add(a,multiply(subtract(b,a),x)),multiply(subtract(c,a),y));}
  return add(add(d,multiply(subtract(c,d),subtract(one,x))),multiply(subtract(b,d),subtract(one,y)));
 }
 if(lessEqual(y,x)) {return add(add(a,multiply(subtract(b,a),x)),multiply(subtract(d,b),y));}
 return add(add(a,multiply(subtract(d,c),x)),multiply(subtract(c,a),y));
}
fn gridPoint(point:vec2f,kind:u32,base:u32)->array<Scalar,2> {
 let x=divide(subtract(scalar(point.x),parameter(base)),parameter(base+2u));
 let y=divide(subtract(scalar(point.y),parameter(base+1u)),parameter(base+3u));
 return array<Scalar,2>(lerpOne(scalar(point.x),gridAxis(0u,kind,base,x,y)),lerpOne(scalar(point.y),gridAxis(1u,kind,base,x,y)));
}
fn needsCorrection(value:Scalar)->bool {
 let magnitude=abs(value.value.x);
 if(!(magnitude>=7.888609052210118e-31 && magnitude<1.0e30)) {return true;}
 let bits=bitcast<u32>(magnitude);
 let upper=bitcast<f32>(bits+1u)-magnitude;
 let lower=magnitude-bitcast<f32>(bits-1u);
 let residual=select(value.value.y,-value.value.y,value.value.x<0.0);
 return min(upper*0.5-residual,lower*0.5+residual)<=value.error*4.0;
}
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) group:vec3u,@builtin(local_invocation_id) local:vec3u) {
 let job=jobs[group.x];
 let kind=job.w&7u;
 let compact=(job.w&0x80000000u)!=0u;
 let packedStart=(job.w&0x7FFFFFFFu)>>3u;
 for(var offset=local.x;offset<job.y;offset+=64u) {
  let index=job.x+offset;let point=vertices[index];uncertain=false;
  var result:array<Scalar,2>;
  if(kind==1u) {result=rotatePoint(point,job.z);} else if(kind==5u) {result=affinePoint(point,job.z);} else {result=gridPoint(point,kind,job.z);}
  let position=vec2f(result[0].value.x,result[1].value.x);
  vertices[index]=position;
  if(compact) {corrections.packed[packedStart+offset]=position;}
  if(uncertain || needsCorrection(result[0]) || needsCorrection(result[1])) {
   let slot=atomicAdd(&corrections.count,1u);
   if(slot<1024u) {corrections.indices[slot]=index;}
  }
 }
}
