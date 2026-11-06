"""Emit bounded Figma scripts from the event Foundation registry.

--plan describes batches. --batch N prints one script; apply in order through
Figma use_figma with the file's active session. This script never sends changes
to Figma. Resolved literals exist only in stdout, not in downstream recipes.
"""
import argparse
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
MAX_BYTES=42000
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def scripts():
 ledger=read(HERE/'component-ledger.json')
 registry=read(HERE.parent/'events_system_tokens/tier_00_foundations.json')
 tokens={t['token_name']:t for t in registry['tokens']}
 def value(key,seen=()):
  if key in seen:raise ValueError('Foundation alias cycle: '+key)
  t=tokens[key]
  if t['reference_token']:return value(t['reference_token'],(*seen,key))
  if t['token_value'] is None:raise ValueError('Unresolved Foundation: '+key)
  return t['token_value']
 header='const page=await figma.getNodeByIdAsync('+json.dumps(ledger['page_id'])+');await figma.setCurrentPageAsync(page);\n'
 fonts=[{'family':value('events.font.family'),'style':value('events.font.'+s)} for s in ['regular','medium','semibold','bold','regular_italic']]
 load_fonts='const fonts='+json.dumps(fonts)+';for(const f of fonts)await figma.loadFontAsync(f);\n'
 updates=[{'id':ident,'key':key,'value':value(key),'type':tokens[key]['value_type']} for key,ident in ledger['variables'].items()]
 variable_code=header+load_fonts+'const mode='+json.dumps(ledger['mode_id'])+';const updates='+json.dumps(updates,separators=(',',':'))+';\n'+r'''
const resolved=[];
for(const u of updates){const v=await figma.variables.getVariableByIdAsync(u.id);if(!v)throw Error('Missing variable '+u.key);let next=u.value;
if(u.type==='color'){if(!/^#[a-f0-9]{6}([a-f0-9]{2})?$/i.test(next))throw Error('Invalid Foundation color '+u.key);const h=next;next={r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255,a:h.length===9?parseInt(h.slice(7,9),16)/255:1};}
resolved.push({v,next});}
const changed=[];for(const{v,next}of resolved){if(JSON.stringify(v.valuesByMode[mode])===JSON.stringify(next))continue;v.setValueForMode(mode,next);changed.push(v.id);}
return {updated_variable_ids:changed,checked_variables:resolved.length,mutated_node_ids:changed.length?page.findAllWithCriteria({types:['TEXT']}).map(n=>n.id):[]};
'''
 yield 'variables',variable_code
 # Share each property-token pair across its consumers, rather than repeating values.
 groups={};geometry=[]
 for entry in ledger['generated_bindings']:
  if entry['kind']=='property':groups.setdefault((entry['property'],entry['token_name']),[]).append(entry['node_id'])
  else:geometry.append(entry)
 grouped=[{'kind':'property','property':p,'token_name':t,'node_ids':ids} for (p,t),ids in groups.items()]
 # Property topology comes before regenerated geometry. Skip unchanged values.
 specs=grouped+geometry
 dimensions={}
 for b in ledger['native_bindings']:
  if b['property'] in ['width','height']:dimensions.setdefault(b['node_id'],{})[b['property']]=b['variable_id']
 body=r'''
const nodes=new Map();for(const s of specs)for(const id of s.node_ids||[s.node_id]){const n=await figma.getNodeByIdAsync(id);if(!n)throw Error('Missing mapped node '+id);nodes.set(id,n);}
const changed=[];
for(const s of specs){if(s.kind==='property'){for(const id of s.node_ids){const n=nodes.get(id),v=values[s.token_name];if(n[s.property]!==v){n[s.property]=v;changed.push(n.id);}}continue;}
const n=nodes.get(s.node_id);
if(s.kind==='vector'){if(n.type!=='VECTOR')throw Error('Expected editable vector');n.vectorPaths=[{windingRule:'EVENODD',data:values[s.token_name]}];for(const[p,id]of Object.entries(dimensions[n.id]||{})){const v=await figma.variables.getVariableByIdAsync(id);n.setBoundVariable(p,v);}}
else if(s.kind==='crop'){const k=s.token_names,z=values['events.size.0'];const m=[[values[k.width]/values[k.source_width],z,values[k.x]/values[k.source_width]],[z,values[k.height]/values[k.source_height],values[k.y]/values[k.source_height]]];if(!n.fills.some(p=>p.type==='IMAGE'))throw Error('Expected content image');n.fills=n.fills.map(p=>p.type==='IMAGE'?{...p,scaleMode:'CROP',imageTransform:m}:p);}
else if(s.kind==='gradient'){const k=s.token_names;const rgba=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255,a:1});n.fills=[{type:'GRADIENT_LINEAR',gradientTransform:values[k.transform],gradientStops:k.colors.map((key,i)=>({position:values[k.stops][i],color:rgba(values[key])}))}];}
else throw Error('Unsupported generated binding '+s.kind);changed.push(n.id);}
return {mutated_node_ids:[...new Set(changed)],checked_mappings:specs.length};
'''
 def code(batch):
  names={'events.size.0'}
  for s in batch:
   if s.get('token_name'):names.add(s['token_name'])
   for v in s.get('token_names',{}).values():names.update(v if isinstance(v,list) else [v])
  vector_ids={s['node_id'] for s in batch if s['kind']=='vector'}
  return header+load_fonts+'const specs='+json.dumps(batch,separators=(',',':'))+';const values='+json.dumps({k:value(k) for k in sorted(names)},separators=(',',':'))+';const dimensions='+json.dumps({k:v for k,v in dimensions.items() if k in vector_ids},separators=(',',':'))+';\n'+body
 batch=[]
 for s in specs:
  if len(code(batch+[s]).encode())>MAX_BYTES and batch:yield 'generated',code(batch);batch=[]
  batch.append(s)
  if len(code(batch).encode())>MAX_BYTES:raise ValueError('Mapping exceeds script limit: '+str(s.get('property')))
 if batch:yield 'generated',code(batch)

def main():
 p=argparse.ArgumentParser(description=__doc__);choice=p.add_mutually_exclusive_group();choice.add_argument('--plan',action='store_true');choice.add_argument('--batch',type=int);args=p.parse_args()
 batches=list(scripts())
 for name,code in batches:
  if len(code.encode())>MAX_BYTES:raise ValueError('Oversized '+name+' batch')
 if args.batch is None:print(json.dumps({'file_key':'AEV0dOjWeK6EzC1vR8zeVK','apply_in_order':[{'batch':i,'kind':name,'bytes':len(code.encode())} for i,(name,code) in enumerate(batches)]},indent=2))
 else:
  if not 0<=args.batch<len(batches):p.error('Batch outside --plan')
  print(batches[args.batch][1])
if __name__=='__main__':main()
