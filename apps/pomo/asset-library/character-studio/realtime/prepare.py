"""Attach bounded elastic particles and body-derived contacts to the accepted GLB."""
import json, struct, math, os
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parent
source=Path(os.environ.get('CLOTH_SOURCE', str(ROOT.parents[2]/'public/character-studio/pomo.glb')))
thickness=float(os.environ.get('CLOTH_THICKNESS', '.005'))
assert math.isfinite(thickness) and 0 < thickness <= .02
data=source.read_bytes()
length=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+length]); binary=data[28+length:]
def accessor(index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
 width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
 return np.frombuffer(binary,dtype=dtype,count=a['count']*width,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)
node=next(n for n in doc['nodes'] if n.get('name')=='Settled knit sweater')
body=next(n for n in doc['nodes'] if n.get('name')=='Pomo connected body physics copy')
assert not any(key in n for n in (node,body) for key in ('matrix','translation','rotation','scale'))
body_points=[];body_faces=[]
for primitive in doc['meshes'][body['mesh']]['primitives']:
 points=accessor(primitive['attributes']['POSITION']);faces=accessor(primitive['indices']).reshape(-1,3)
 body_faces.extend((faces+len(body_points)).tolist());body_points.extend(points.tolist())
body_tree=BVHTree.FromPolygons(body_points,body_faces,all_triangles=True)
primitive=doc['meshes'][node['mesh']]['primitives'][0]
assert len(doc['meshes'][node['mesh']]['primitives'])==1
points=accessor(primitive['attributes']['POSITION']);faces=accessor(primitive['indices']).reshape(-1,3)
def ramp(a,b,x):
 t=min(1,max(0,(x-a)/(b-a)));return t*t*(3-2*t)
def mobility(point):
 x,y,z=map(float,point)
 sleeve=ramp(.16,.23,abs(x))*(1-ramp(1.02,1.17,y))
 hem=(1-ramp(.78,.90,y))*(1-ramp(.15,.20,abs(x)))
 return max(sleeve*.85,hem*.8)
# Shared positions (including UV seams) get the same contact and motion limit.
limits={};clearances=[];buckets={};mapping=[];particles=[];movement=[];contacts=[]
for point in points:
 key=','.join(str(math.floor(float(v)*100000+.5)) for v in point)
 location,normal,face,distance=body_tree.find_nearest(point)
 clearances.append(distance)
 amount=mobility(point)
 # The rendered surface is the outside of the fabric; reserve its full thickness.
 limits[key]=min(.006*amount,max(0,distance-thickness)*.4)
 bucket=tuple(math.floor(float(v)/.025) for v in point)
 # Separate fixed and moving zones to retain the accepted collar/chest silhouette.
 bucket=(*bucket,amount>0)
 if bucket not in buckets:
  buckets[bucket]=len(particles)
  particles.append(point.tolist());movement.append(amount)
  direction=np.array(point)-np.array(location)
  direction/=max(float(np.linalg.norm(direction)),1e-9)
  contacts.extend([*direction.tolist(),max(0,distance-thickness)])
 mapping.append(buckets[bucket])
edges=set()
for a,b,c in faces:
 for first,second in [(a,b),(b,c),(c,a)]:
  pair=tuple(sorted((mapping[first],mapping[second])))
  if pair[0]!=pair[1]:edges.add(pair)
metadata={'positions':np.array(particles).flatten().tolist(),'mobility':movement,'contacts':contacts,'edges':np.array(sorted(edges)).flatten().tolist(),'limits':limits}
assert len(particles)<=4000 and len(edges)*2<=40000
node.setdefault('extras',{})['pomoCloth']=json.dumps(metadata,separators=(',',':'))
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
(ROOT/'model.glb').write_bytes(result)
report={'particles':len(particles),'springs':len(edges),'render_vertices':len(points),'moving_vertices':sum(v>0 for v in limits.values()),'max_surface_motion_m':max(limits.values()),'body_faces':len(body_faces),'fabric_thickness_m_assumption':thickness,'binary_geometry_materials_unchanged':binary==result[28+len(encoded):],'collision_method':'Body nearest-surface contact planes with per-vertex clearance bounds reserving fabric thickness for the fixed wearing pose'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
