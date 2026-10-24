import json,pathlib,statistics,collections,sys,re
p=pathlib.Path(sys.argv[1]).resolve();rows=[json.loads(s) for s in (p/'measured.jsonl').read_text().splitlines()]
groups=collections.defaultdict(list)
for r in rows: groups[r['name'],r['variant'],r['phase']].append(r)
expected_names={c['name'] for c in json.loads((p/'fixtures.json').read_text())} | {'real-fileRevision','real-getWindow','real-definition','real-javascript'}
for name in expected_names:
 for variant in ['existing','before','linked']:
  for phase in ['cold','repeat']:
   expected_runs=5 if name in ['real-fileRevision','real-getWindow'] else 3
   assert len(groups[name,variant,phase])==expected_runs,(name,variant,phase)
summary=[];errors=[]
for (name,variant,phase),group in groups.items():
 base=groups[name,'existing','cold'][0]['positions']
 entry=dict(name=name,variant=variant,phase=phase,samples=len(group),count=group[0]['count'])
 for field in ['first','complete']:
  values=[r[field] for r in group if r[field] is not None];entry[field]=dict(median=statistics.median(values),minimum=min(values),maximum=max(values)) if values else None
 entry['vsExisting']=dict(missing=sorted(set(base)-set(group[0]['positions'])),unexpected=sorted(set(group[0]['positions'])-set(base)))
 if variant=='linked':
  before=groups[name,'before','cold'][0]['positions']
  assert group[0]['positions']==before,('before-after locations',name,phase)
 entry['stable']=all(r['positions']==group[0]['positions'] for r in group) and all(r['positions']==groups[name,variant,'cold'][0]['positions'] for r in group)
 entry['accuracy']=group[0].get('accuracy');entry['partialBatches']=sum(r['partialBatches'] for r in group)
 if variant=='linked':
  entry['stages']={key:statistics.median(r['stages'][key] for r in group) for key in group[0]['stages']}
  if not entry['stable'] or any((entry.get('accuracy') or {}).values()):errors.append(entry)
 if variant=='linked' and name.startswith('real-') and any(entry['vsExisting'].values()):errors.append(entry)
 if variant=='linked' and group[0].get('details') is not None:
  names=set().union(*(r['details'] for r in group))
  entry['details']={key:dict(milliseconds=statistics.median(r['details'].get(key,{}).get('milliseconds',0) for r in group),count=statistics.median(r['details'].get(key,{}).get('count',0) for r in group)) for key in sorted(names)}
 if variant!='existing':
  logs=[json.loads((p/f'measured-{name}-{variant}-{r["run"]}.log').read_text()) for r in group]
  fields=['scope','sources','opened','bindings','declarations','inputs','resolutionCalls','resolutionHits']
  entry['workspace']={key:statistics.median(v[key] for v in logs) for key in fields if key in logs[0]}
  if variant=='linked':
   entry['metadataTimings']={category:{key:dict(milliseconds=statistics.median(v[category][key]['milliseconds'] for v in logs),count=statistics.median(v[category][key]['count'] for v in logs)) for key in logs[0][category]} for category in ['metadataTimings','importTimings']}
 summary.append(entry)
(p/'summary.json').write_text(json.dumps(summary,indent=2));print('records',len(rows),'linked failures',len(errors));print(json.dumps(errors,indent=2))
for name in [n for n,v,phase in groups if v=='existing' and phase=='cold']:
 if not name.startswith('real-'):continue
 for variant in ['existing','before','linked']:
  cold=next(r for r in summary if r['name']==name and r['variant']==variant and r['phase']=='cold');repeat=next(r for r in summary if r['name']==name and r['variant']==variant and r['phase']=='repeat')
  print(name,variant,cold['count'],round(cold['first']['median'],3),round(cold['complete']['median'],3),round(repeat['first']['median'],3),round(repeat['complete']['median'],3),cold['vsExisting'])
for r in summary:
 if r['phase']=='cold' and r['accuracy'] and any(r['accuracy'].values()): print('fixture difference',r['name'],r['variant'],r['accuracy'])
server_open=[]
for run in range(1,6):
 data=json.loads((p/f'measured-real-getWindow-linked-{run}.log').read_text());active=False;count=0;total=0
 for notification in data['notifications']:
  message=notification.get('message','')
  if "handled method 'textDocument/references' (2)" in message:active=True
  if active:
   match=re.search(r"handled method 'textDocument/didOpen' in ([\d.]+)(ns|µs|ms|s)",message)
   if match:count+=1;total+=float(match[1])*{'ns':1e-6,'µs':1e-3,'ms':1,'s':1000}[match[2]]
   if "handled method 'textDocument/definition' (3)" in message:active=False
 server_open.append(dict(run=run,opened=count,serverMilliseconds=total))
(p/'server-open.json').write_text(json.dumps(server_open,indent=2)+'\n')
assert not errors
