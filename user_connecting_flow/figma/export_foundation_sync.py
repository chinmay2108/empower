"""Emit bounded Figma MCP scripts from Foundations; never contacts Figma itself.

Default/--plan prints batch indexes. Apply --batch N outputs in order with
use_figma. Literal payloads exist only in stdout; do not save them in tier docs.
"""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_SCRIPT_BYTES = 42000

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def scripts():
    ledger = read(HERE / 'connection-flow-ledger.json')
    registry = read(HERE.parent / 'userconnections_system_tokens' / 'tier_00_foundations.json')
    tokens = {t['token_name']: t for t in registry['tokens']}

    def value(name, chain=()):
        if name in chain:
            raise ValueError('Foundation alias cycle: ' + name)
        t = tokens[name]
        if t['reference_token']:
            return value(t['reference_token'], (*chain, name))
        if t['token_value'] is None:
            raise ValueError('Unresolved Foundation: ' + name)
        return t['token_value']

    updates = [{'id': ident, 'name': name, 'type': tokens[name]['value_type'], 'value': value(name)}
               for name, ident in ledger['variables'].items()]
    header = 'const ledger=' + json.dumps({'page_id': ledger['page_id'], 'mode_id': ledger['mode_id']}) + ';\n'
    setup = 'const page=await figma.getNodeByIdAsync(ledger.page_id);await figma.setCurrentPageAsync(page);\n'
    variable_code = header + setup + 'const updates=' + json.dumps(updates) + ';\n' + r'''
const values=Object.fromEntries(updates.map(u=>[u.name,u.value]));
const fonts=new Map();
for(const node of page.findAllWithCriteria({types:['TEXT']}))
  for(const segment of node.getStyledTextSegments(['fontName']))
    fonts.set(JSON.stringify(segment.fontName),segment.fontName);
for(const role of ['prompt','answer']){
  const font={family:values['profile.type.'+role+'.family'],style:values['profile.type.'+role+'.style']};
  fonts.set(JSON.stringify(font),font);
}
for(const key of Object.keys(values).filter(k=>k.startsWith('connections.type.style.'))){
  const font={family:values['profile.type.prompt.family'],style:values[key]};
  fonts.set(JSON.stringify(font),font);
}
for(const font of fonts.values())await figma.loadFontAsync(font);
const resolved=[];
for(const u of updates){
  const variable=await figma.variables.getVariableByIdAsync(u.id);
  if(!variable)throw Error('Missing variable: '+u.name);
  resolved.push([variable,u]);
}
for(const [variable,u] of resolved){
  let v=u.value;
  if(u.type==='color'){
    if(!/^#[0-9a-f]{6}$/i.test(v))throw Error('Expected RGB hex Foundation: '+u.name);
    v={r:parseInt(v.slice(1,3),16)/255,g:parseInt(v.slice(3,5),16)/255,b:parseInt(v.slice(5,7),16)/255,a:values['profile.number.one']};
  }
  variable.setValueForMode(ledger.mode_id,v);
}
return {updated_variable_ids:resolved.map(([v])=>v.id)};
'''
    yield ('variables', variable_code)
    geometry_body = r'''
const targets=[];
for(const spec of geometry){
  const n=await figma.getNodeByIdAsync(spec.node_id);
  if(!n)throw Error('Missing geometry node: '+spec.node_id);
  if(spec.property==='vectorPaths'&&n.type!=='VECTOR')throw Error('Expected vector');
  if(spec.property==='imageTransform'&&!n.fills.some(p=>p.type==='IMAGE'))throw Error('Expected image fill');
  targets.push([n,spec]);
}
for(const [n,spec]of targets){
  if(spec.property==='vectorPaths')n.vectorPaths=[{windingRule:'EVENODD',data:values[spec.token_name]}];
  else if(spec.property==='badgePosition'){
    const k=spec.token_names;n.x=values[k.item_width]/2+values[k.offset];n.y=values[k.top];
  }else if(spec.property==='imageTransform'){
    const k=spec.token_names,z=values['profile.number.zero'];
    let h=values[k.height],y=values[k.y];
    if(spec.crop_mode==='bottom'){h=values[k.visible_height]*values[k.scale];y+=values[k.height]-h;}
    const imageTransform=[[values[k.width]/values[k.source_width],z,values[k.x]/values[k.source_width]],[z,h/values[k.source_height],y/values[k.source_height]]];
    n.fills=n.fills.map(p=>p.type!=='IMAGE'?p:{...p,scaleMode:'CROP',imageTransform});
  }else throw Error('Unknown geometry recipe: '+spec.property);
}
return {mutated_node_ids:targets.map(([n])=>n.id),geometry_regenerated:true};
'''
    def geometry_script(specs):
        names={'profile.number.zero'}
        for spec in specs:
            if spec.get('token_name'):
                names.add(spec['token_name'])
            names.update(spec.get('token_names', {}).values())
        return (header + setup + 'const geometry=' + json.dumps(specs) + ';\nconst values=' +
                json.dumps({k:value(k) for k in sorted(names)}) + ';\n' + geometry_body)

    batch=[]
    for original in ledger['generated_geometry']:
        spec=dict(original)
        if isinstance(spec.get('token_names'),list):
            spec['token_names']=dict(zip(('x','y','width','height','source_width','source_height'),spec['token_names']))
        candidate=geometry_script([*batch,spec])
        if len(candidate.encode())>MAX_SCRIPT_BYTES and batch:
            yield ('geometry',geometry_script(batch))
            batch=[]
        batch.append(spec)
        if len(geometry_script(batch).encode())>MAX_SCRIPT_BYTES:
            raise ValueError('One geometry entry exceeds the MCP batch budget: '+spec['node_id'])
    if batch:
        yield ('geometry',geometry_script(batch))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    choice=parser.add_mutually_exclusive_group()
    choice.add_argument('--plan',action='store_true')
    choice.add_argument('--batch',type=int)
    args=parser.parse_args()
    batches=list(scripts())
    for name,code in batches:
        if len(code.encode())>MAX_SCRIPT_BYTES:
            raise ValueError('Oversized '+name+' batch')
    if args.batch is None:
        print(json.dumps({'file_key':'AEV0dOjWeK6EzC1vR8zeVK','apply_in_order':[
            {'batch':i,'kind':name,'bytes':len(code.encode())} for i,(name,code) in enumerate(batches)]},indent=2))
    else:
        if not 0<=args.batch<len(batches):
            parser.error('Batch index outside the current --plan')
        print(batches[args.batch][1])

if __name__=='__main__':
    main()
