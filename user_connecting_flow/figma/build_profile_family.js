// Executed through Figma MCP with FOUNDATION_TOKENS injected from the local registry.
const page = await figma.getNodeByIdAsync('13:28');
await figma.setCurrentPageAsync(page);
if (page.children.some(n => n.name === 'Profile family / Review')) throw new Error('Family already exists; update using its saved ledger.');
const values = Object.fromEntries(FOUNDATION_TOKENS.map(t => [t.token_name, t.token_value]));
const value = key => values['profile.' + key];
const ids = [], bindings = [], generatedGeometry = [], componentIds = {}, textStyleIds = {};
const vars = {};
// Adapted from the library skill createVariableCollection helper.
async function createVariableCollection(name, modeNames) {
  const collection = figma.variables.createVariableCollection(name);
  const modeIds = {};
  collection.renameMode(collection.modes[0].modeId, modeNames[0]);
  modeIds[modeNames[0]] = collection.modes[0].modeId;
  return {collection, modeIds};
}
const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
if (existingCollections.some(c => c.name === 'User Connections / Foundations')) throw new Error('Foundation collection already exists; inspect ledger before retry.');
for (const role of ['prompt', 'answer']) await figma.loadFontAsync({family:value('type.'+role+'.family'),style:value('type.'+role+'.style')});
const {collection,modeIds}=await createVariableCollection('User Connections / Foundations',['Reference draft']);
const mode=modeIds['Reference draft'];
function scopes(t) {
  if(t.value_type==='color') return ['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];
  if(t.value_type==='font_family')return ['FONT_FAMILY'];
  if(t.value_type==='font_style')return ['FONT_STYLE'];
  if(t.token_name.includes('line_height'))return ['LINE_HEIGHT'];
  if(t.token_name.includes('type.tracking'))return ['LETTER_SPACING'];
  if(t.token_name.includes('type.')&&t.token_name.endsWith('.size'))return ['FONT_SIZE'];
  if(t.token_name.includes('.radius.'))return ['CORNER_RADIUS'];
  if(t.value_type==='opacity')return ['OPACITY'];
  return ['WIDTH_HEIGHT','GAP','CORNER_RADIUS','STROKE_FLOAT','PARAGRAPH_SPACING','PARAGRAPH_INDENT'];
}
for(const token of FOUNDATION_TOKENS){
  if(token.value_type==='vector_path')continue;
  let v=token.token_value;
  const type=token.value_type==='color'?'COLOR':typeof v==='string'?'STRING':'FLOAT';
  if(type==='COLOR'){const hex=v.slice(1);v={r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255,a:value('number.one')};}
  const variable=figma.variables.createVariable(token.token_name.replaceAll('.','/'),collection,type);
  variable.scopes=scopes(token);variable.setValueForMode(mode,v);
  variable.setVariableCodeSyntax('WEB','var(--'+token.token_name.replaceAll('.','-')+')');
  variable.description='Source: user_connecting_flow/userconnections_system_tokens/tier_00_foundations.json :: '+token.token_name+'. '+token.evidence.measurement_method+' Status: '+token.status;
  vars[token.token_name]=variable;
}
function bind(node,property,key){const name='profile.'+key;node.setBoundVariable(property,vars[name]);bindings.push({node_id:node.id,property,token_name:name,variable_id:vars[name].id});}
function fill(node,key){const name='profile.'+key;const v=vars[name];const c=v.valuesByMode[mode];node.fills=[figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:c.r,g:c.g,b:c.b}},'color',v)];bindings.push({node_id:node.id,property:'fills',token_name:name,variable_id:v.id});}
function track(n){ids.push(n.id);bind(n,'opacity','opacity.full');if('strokes'in n){n.strokes=[];bind(n,'strokeWeight','number.zero');}if('cornerRadius'in n)bind(n,'cornerRadius','number.zero');return n;}
function layout(n,direction='VERTICAL'){
  n.layoutMode=direction;n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='AUTO';n.fills=[];
  for(const p of ['paddingLeft','paddingRight','paddingTop','paddingBottom','itemSpacing'])bind(n,p,'number.zero');
  return n;
}
function main(name,key){const n=track(figma.createComponent());n.name=name;layout(n);componentIds[key]=n.id;return n;}
function inst(c,parent){const n=c.createInstance();ids.push(n.id);bind(n,'opacity','opacity.full');parent.appendChild(n);return n;}
function fixed(n,w,h){n.resize(value(w),value(h));bind(n,'width',w);bind(n,'height',h);}
function centered(n){n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';}
const icons={};
for(const kind of ['heart','pass']){
  const c=main('Profile / Icons / '+kind,'icon_'+kind);centered(c);
  const v=track(figma.createVector());v.name=kind+' / traced contour';v.vectorPaths=[{windingRule:'EVENODD',data:value('icon.'+kind+'.path')}];c.appendChild(v);
  fixed(v,'icon.'+kind+'.width','icon.'+kind+'.height');fill(v,kind==='heart'?'color.icon_inverse':'color.action');
  fixed(c,'icon.'+kind+'.width','icon.'+kind+'.height');
  generatedGeometry.push({node_id:v.id,property:'vectorPaths',token_name:'profile.icon.'+kind+'.path'});
  c.description='Editable contour traced from the supplied reference; dimensions and fill are variable-bound. Path geometry is generated from its Foundation token.';icons[kind]=c;
}
const controls={};
for(const kind of ['like','pass']){
  const c=main('Profile / Actions / '+kind,kind);centered(c);fixed(c,'size.'+kind,'size.'+kind);bind(c,'cornerRadius','radius.round');fill(c,kind==='like'?'color.action':'color.surface');
  const icon=inst(icons[kind==='like'?'heart':'pass'],c);
  const property=c.addComponentProperty('Icon','INSTANCE_SWAP',icons[kind==='like'?'heart':'pass'].id);icon.componentPropertyReferences={mainComponent:property};
  c.description=kind==='like'?'Like the selected profile content. Proposed action: onLike(profileId, contentId). Resting state only.':'Pass the current profile. Screen-level control; proposed action: onPass(profileId). Resting state only.';
  controls[kind]=c;
}
const photo=main('Profile / Photo card','photo');fixed(photo,'size.card','size.card');bind(photo,'cornerRadius','radius.card');photo.clipsContent=true;photo.primaryAxisAlignItems='MAX';photo.counterAxisAlignItems='MAX';
for(const p of ['paddingLeft','paddingRight','paddingTop','paddingBottom'])bind(photo,p,'space.photo_inset');
const source=await figma.getNodeByIdAsync('2:3');const sourceFill=source.fills.find(f=>f.type==='IMAGE');
photo.fills=[{type:'IMAGE',imageHash:sourceFill.imageHash,scaleMode:'CROP',imageTransform:[[value('photo.crop_width')/value('source.width'),value('number.zero'),value('photo.crop_x')/value('source.width')],[value('number.zero'),value('photo.crop_height')/value('source.height'),value('photo.crop_y')/value('source.height')]]}];
generatedGeometry.push({node_id:photo.id,property:'imageTransform',token_names:['profile.photo.crop_x','profile.photo.crop_y','profile.photo.crop_width','profile.photo.crop_height','profile.source.width','profile.source.height']});
const photoLike=inst(controls.like,photo);const show=photo.addComponentProperty('Show like','BOOLEAN',true);photoLike.componentPropertyReferences={visible:show};
photo.description='Replaceable photo fill, editable crop, rounded container and nested like instance. The photo retains the obscuration already present in the supplied reference. Show like is an exposed Boolean property.';
for(const role of ['prompt','answer']){
  const s=figma.createTextStyle();s.name='Profile / '+role+' / provisional';s.fontName={family:value('type.'+role+'.family'),style:value('type.'+role+'.style')};s.fontSize=value('type.'+role+'.size');s.lineHeight={unit:'PIXELS',value:value('type.'+role+'.line_height')};s.letterSpacing={unit:'PIXELS',value:value('type.tracking')};
  for(const [prop,key]of [['fontFamily','type.'+role+'.family'],['fontStyle','type.'+role+'.style'],['fontSize','type.'+role+'.size'],['lineHeight','type.'+role+'.line_height'],['letterSpacing','type.tracking']])s.setBoundVariable(prop,vars['profile.'+key]);
  s.description='User-approved provisional typography. Review font identity before source fidelity is considered complete.';textStyleIds[role]=s.id;
}
const prompt=main('Profile / Prompt card','prompt');prompt.counterAxisSizingMode='FIXED';prompt.resize(value('size.card'),value('number.one'));bind(prompt,'width','size.card');fill(prompt,'color.surface');bind(prompt,'cornerRadius','radius.card');
for(const p of ['paddingLeft','paddingRight'])bind(prompt,p,'space.prompt_inline');bind(prompt,'paddingTop','space.prompt_top');bind(prompt,'paddingBottom','space.prompt_bottom');bind(prompt,'itemSpacing','space.prompt_gap');
async function text(parent,role,content,propertyOwner){
  const n=track(figma.createText());n.name=role;await n.setTextStyleIdAsync(textStyleIds[role]);n.characters=content;parent.appendChild(n);n.resize(value('size.card')-value('space.prompt_inline')-value('space.prompt_inline'),value('number.one'));n.layoutSizingHorizontal='FILL';n.textAutoResize='HEIGHT';n.layoutSizingVertical='HUG';
  for(const [prop,key]of [['fontFamily','type.'+role+'.family'],['fontStyle','type.'+role+'.style'],['fontSize','type.'+role+'.size'],['lineHeight','type.'+role+'.line_height'],['letterSpacing','type.tracking'],['paragraphSpacing','number.zero'],['paragraphIndent','number.zero']])bind(n,prop,key);
  fill(n,'color.ink');if(propertyOwner){const p=propertyOwner.addComponentProperty(role==='prompt'?'Prompt':'Answer','TEXT',content);n.componentPropertyReferences={characters:p};}return n;
}
await text(prompt,'prompt','Teach me something about',prompt);
await text(prompt,'answer','Anything and everything. I miss school very much.',prompt);
prompt.primaryAxisSizingMode='AUTO';prompt.description='Editable prompt and answer properties with automatic height. Typography and prompt padding are provisional and flagged in Foundations.';
const assembly=main('Profile / Card assembly','assembly');bind(assembly,'itemSpacing','space.card_gap');assembly.counterAxisSizingMode='FIXED';assembly.resize(value('size.card'),value('number.one'));bind(assembly,'width','size.card');inst(photo,assembly);inst(prompt,assembly);assembly.primaryAxisSizingMode='AUTO';assembly.description='Reusable photo and prompt composition. Edit nested text properties and photo fill. Pass remains a screen-level control outside this component.';
const review=track(figma.createAutoLayout('HORIZONTAL'));review.name='Profile family / Review';layout(review,'HORIZONTAL');fill(review,'color.canvas');for(const p of ['paddingLeft','paddingRight','paddingTop','paddingBottom','itemSpacing'])bind(review,p,'space.review');
review.x=value('space.review');review.y=value('space.review');review.counterAxisAlignItems='MIN';inst(assembly,review);
const examples=track(figma.createAutoLayout('VERTICAL'));layout(examples);review.appendChild(examples);bind(examples,'itemSpacing','space.review');examples.counterAxisSizingMode='FIXED';examples.resize(value('size.card'),value('number.one'));bind(examples,'width','size.card');
await text(examples,'prompt','PROFILE FAMILY Â· REFERENCE DRAFT');
await text(examples,'prompt','Editable components. Provisional typography.');
inst(prompt,examples);
const actions=track(figma.createAutoLayout('HORIZONTAL'));layout(actions,'HORIZONTAL');bind(actions,'itemSpacing','space.card_gap');actions.counterAxisAlignItems='CENTER';examples.appendChild(actions);inst(controls.like,actions);inst(controls.pass,actions);examples.primaryAxisSizingMode='AUTO';
let y=value('space.review');for(const id of Object.values(componentIds)){const c=await figma.getNodeByIdAsync(id);c.x=review.x+review.width+value('space.review');c.y=y;y+=c.height+value('space.review');}
return {page_id:page.id,review_id:review.id,collection_id:collection.id,mode_id:mode,created_node_ids:ids,component_ids:componentIds,text_style_ids:textStyleIds,variables:Object.fromEntries(Object.entries(vars).map(([k,v])=>[k,v.id])),bindings,generated_geometry:generatedGeometry,review_bounds:{width:review.width,height:review.height},component_bounds:await Promise.all(Object.entries(componentIds).map(async([key,id])=>{const n=await figma.getNodeByIdAsync(id);return {key,id,width:n.width,height:n.height};}))};
