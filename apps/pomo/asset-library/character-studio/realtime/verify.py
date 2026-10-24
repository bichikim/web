"""Check Babylon-produced cloth snapshots against the unchanged body triangles."""
import json,struct
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
blob=(ROOT/'model.glb').read_bytes();length=struct.unpack_from('<I',blob,12)[0]
doc=json.loads(blob[20:20+length]);binary=blob[28+length:]
def accessor(index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
 width={'SCALAR':1,'VEC3':3}[a['type']]
 return np.frombuffer(binary,dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']],count=a['count']*width,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)
body=next(n for n in doc['nodes'] if n.get('name')=='Pomo connected body physics copy')
points=[];faces=[]
for primitive in doc['meshes'][body['mesh']]['primitives']:
 p=accessor(primitive['attributes']['POSITION']);f=accessor(primitive['indices']).reshape(-1,3)
 faces.extend((f+len(points)).tolist());points.extend(p.tolist())
body_tree=BVHTree.FromPolygons(points,faces,all_triangles=True)
snapshots=json.loads(Path('/private/tmp/pomo-cloth-frames.json').read_text())
garment=next(n for n in doc['nodes'] if n.get('name')=='Settled knit sweater')
primitive=doc['meshes'][garment['mesh']]['primitives'][0]
assert np.array_equal(np.array(snapshots['original']).reshape(-1,3),accessor(primitive['attributes']['POSITION'])), 'Snapshots do not match the candidate garment'
assert np.array_equal(np.array(snapshots['faces']).reshape(-1,1),accessor(primitive['indices'])), 'Snapshots do not match the candidate topology'
faces=np.array(snapshots['faces']).reshape(-1,3).tolist()
def contacts(positions):
 return set(BVHTree.FromPolygons(np.array(positions).reshape(-1,3).tolist(),faces,all_triangles=True).overlap(body_tree))
report=json.loads((ROOT/'validation.json').read_text())
original=np.array(snapshots['original']).reshape(-1,3)
thickness=report['fabric_thickness_m_assumption']
distances=np.array([body_tree.find_nearest(point)[3] for point in original])
motion_budget=np.maximum(0,distances-thickness)*.4
baseline=contacts(snapshots['original']);counts=[];added=[];overshoots=[]
for frame in snapshots['frames']:
 overlap=contacts(frame);counts.append(len(overlap));added.append(len(overlap-baseline))
 displacement=np.linalg.norm(np.array(frame).reshape(-1,3)-original,axis=1)
 overshoots.append(float(np.maximum(0,displacement-motion_budget).max()))
report.update(sampled_frames=len(counts),baseline_triangle_intersections=len(baseline),maximum_triangle_intersections=max(counts),maximum_new_triangle_intersections=max(added),maximum_thickness_motion_budget_overshoot_m=max(overshoots))
(ROOT/'validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
assert max(added)==0
assert max(overshoots)<1e-6
