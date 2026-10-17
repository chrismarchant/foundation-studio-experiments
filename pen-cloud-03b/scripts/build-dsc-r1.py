#!/usr/bin/env python3
"""Deterministic DSC r1 builder: Penpot serialisation + PEN-CLOUD-02/03 mappings -> fs.ds.relume-default.r1.json.
Canonical JSON (sorted keys, no whitespace) is hashed with the `revision` field empty; the file is then written pretty-printed with the revision filled in. Re-running produces byte-identical output."""
import json, hashlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parents[1]
ser = json.load(open(root / 'inputs/penpot/serialisation.json'))
struct = json.load(open(root / 'inputs/penpot/structure.json'))
relume = next(s for s in ser['tokenSets'] if s['name'] == 'PEN-CLOUD-02 relume')
PX = lambda v: f"{int(float(v))}px" if float(v) == int(float(v)) else f"{v}px"
TYPE = {'color': 'color', 'fontSizes': 'fontSize', 'spacing': 'spacing', 'borderRadius': 'borderRadius'}
# per-breakpoint overrides from the Relume preset / component rules (desktop ramp is the token value)
RESP = {'font.size.h1': {'md': '48px', 'sm': '40px'}, 'font.size.h2': {'md': '40px', 'sm': '36px'}, 'font.size.h4': {'md': '28px', 'sm': '24px'},
        'space.section.lg': {'md': '96px', 'sm': '64px'}}
entries = []
for t in sorted(relume['tokens'], key=lambda t: t['name']):
    kind = TYPE[t['type']]
    value = t['value'] if kind == 'color' else PX(t['value'])
    e = {'id': 'fs.token.' + t['name'], 'type': kind, 'value': value.lower() if kind == 'color' else value, 'set': 'fs.tokens.relume',
         'external': {'penpot': t['name'], 'penpotTokenId': t['id'], 'relume': {'color.scheme.background': 'scheme-background', 'color.scheme.foreground': 'scheme-foreground', 'color.scheme.text': 'scheme-text', 'color.scheme.border': 'scheme-border', 'color.scheme.btn-text': 'scheme-btn-text', 'color.neutral.darkest': 'neutral-darkest', 'font.size.h1': 'text-h1', 'font.size.h2': 'text-h2', 'font.size.h3': 'text-h3', 'font.size.h4': 'text-h4', 'font.size.h5': 'text-h5', 'font.size.h6': 'text-h6', 'font.size.medium': 'text-medium', 'font.size.regular': 'text-regular', 'font.size.small': 'text-small', 'space.section.lg': 'py-28', 'space.section.md': 'py-24', 'space.section.sm': 'py-16', 'space.gap.4': 'gap-4', 'space.gap.6': 'gap-6', 'space.gap.8': 'gap-8', 'radius.button': 'rounded-button', 'radius.card': 'rounded-card', 'radius.image': 'rounded-image'}.get(t['name'])}}
    if t['name'] in RESP: e['responsive'] = RESP[t['name']]
    entries.append(e)
# line heights / weights the Relume preset defines but Penpot holds no token for (recorded as DSC entries without a Penpot external)
for n, v, ext in [('font.lineHeight.heading', '1.2', 'text-h1..h3 lineHeight'), ('font.lineHeight.h4', '1.3', 'text-h4'), ('font.lineHeight.body', '1.5', 'text-medium/regular/small'), ('font.weight.bold', '700', 'font-bold'), ('font.weight.semibold', '600', 'font-semibold'), ('font.weight.regular', '400', 'font-normal'), ('font.letterSpacing.heading', '-0.01em', 'text-h1..h6'), ('font.family.sans', '"Source Sans 3", system-ui, sans-serif', 'OD-40 fixed font (Relume prescribes none)')]:
    entries.append({'id': 'fs.token.' + n, 'type': n.split('.')[1], 'value': v, 'set': 'fs.tokens.relume', 'external': {'penpot': None, 'relume': ext}})
# components and sections from the desktop structure + identity plugin data
def find(node, pred, acc):
    if pred(node): acc.append(node)
    for c in node.get('k', []): find(c, pred, acc)
    return acc
boards = struct['boards']
def section_ids(name):
    out = {}
    for bp in ('desktop', 'tablet', 'mobile'):
        s = next(x for x in boards[bp]['sections'] if x['n'] == name); out[bp] = s['id']
    return out
sections = [('fs.section.navbar', 'Navbar17', 'navbar17_component'), ('fs.section.hero', 'Header80 / StickyStage', 'section_header80'), ('fs.section.features', 'Layout620', 'section_layout620'), ('fs.section.testimonials', 'Testimonial37', 'section_testimonial37'), ('fs.section.cta', 'Cta25', 'section_cta25')]
hero_spec = json.loads(ser['boards']['desktop']['sections'][1]['pluginData']['foundation.animationSpec'])
nav_spec = json.loads(ser['boards']['desktop']['sections'][0]['pluginData']['foundation.animationSpec'])
comps = []
prim = ser['main_Button_Button_Primary']; sec = ser['main_Button_Button_Secondary']
comps.append({'id': 'fs.component.button.primary', 'kind': 'primitive', 'external': {'relume': {'primitive': 'button', 'variant': 'default', 'size': 'default'}, 'claudeDesign': {'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'component': 'Button', 'props': {'variant': 'primary'}}, 'penpot': {'componentId': '4d569422-e5e3-8076-8008-cdeb5017d341', 'mainShapeId': prim['id']}},
              'bindings': [{'property': 'fill', 'token': 'fs.token.color.neutral.darkest'}, {'property': 'strokeColor', 'token': 'fs.token.color.scheme.border'}, {'property': 'labelFill', 'token': 'fs.token.color.scheme.btn-text'}, {'property': 'borderRadius', 'token': 'fs.token.radius.button'}, {'property': 'labelFontSize', 'token': 'fs.token.font.size.regular'}],
              'geometry': {'height': 48, 'paddingX': 24, 'paddingY': 12, 'gap': 12, 'strokeWidth': 1}, 'dependencies': [{'name': 'class-variance-authority', 'range': '0.7.1'}, {'name': '@radix-ui/react-slot', 'range': '*'}]})
comps.append({'id': 'fs.component.button.secondary', 'kind': 'primitive', 'external': {'relume': {'primitive': 'button', 'variant': 'secondary', 'size': 'default'}, 'claudeDesign': {'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'component': 'Button', 'props': {'variant': 'secondary'}}, 'penpot': {'componentId': '4d569422-e5e3-8076-8008-cdeb501973cd', 'mainShapeId': sec['id']}},
              'bindings': [{'property': 'fill', 'token': 'fs.token.color.scheme.foreground'}, {'property': 'strokeColor', 'token': 'fs.token.color.scheme.border'}, {'property': 'labelFill', 'token': 'fs.token.color.scheme.text'}, {'property': 'borderRadius', 'token': 'fs.token.radius.button'}, {'property': 'labelFontSize', 'token': 'fs.token.font.size.regular'}],
              'geometry': {'height': 48, 'paddingX': 24, 'paddingY': 12, 'gap': 12, 'strokeWidth': 1}, 'dependencies': [{'name': 'class-variance-authority', 'range': '0.7.1'}]})
for lid, name, slug in sections:
    c = {'id': lid, 'kind': 'section', 'external': {'relume': {'slug': slug, 'version': None, 'hash': None}, 'penpot': section_ids(name)}, 'responsive': {'lg': {'canvas': 1440}, 'md': {'canvas': 768}, 'sm': {'canvas': 375}}, 'bindings': [{'property': 'paddingTop', 'token': 'fs.token.space.section.lg'}, {'property': 'paddingBottom', 'token': 'fs.token.space.section.lg'}, {'property': 'background', 'token': 'fs.token.color.scheme.background'}] if lid != 'fs.section.navbar' else [{'property': 'background', 'token': 'fs.token.color.scheme.background'}], 'dependencies': []}
    if lid == 'fs.section.hero':
        c['interaction'] = hero_spec; c['responsive']['sm']['initialTransform'] = '-12.5%'; c['dependencies'] = [{'name': 'motion', 'range': '^12.15.0'}]
        c['bindings'] = [{'property': 'background', 'token': 'fs.token.color.scheme.background'}, {'property': 'headingFontSize', 'token': 'fs.token.font.size.h1'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}]
    if lid == 'fs.section.navbar': c['interaction'] = nav_spec; c['dependencies'] = [{'name': 'motion', 'range': '^12.15.0'}]
    if lid == 'fs.section.features': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'itemHeadingFontSize', 'token': 'fs.token.font.size.h4'}, {'property': 'gridGap', 'token': 'fs.token.space.gap.8'}, {'property': 'dividerColor', 'token': 'fs.token.color.scheme.border'}]
    if lid == 'fs.section.testimonials': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'cardBorder', 'token': 'fs.token.color.scheme.border'}, {'property': 'cardFill', 'token': 'fs.token.color.scheme.foreground'}, {'property': 'cardRadius', 'token': 'fs.token.radius.card'}, {'property': 'gridGap', 'token': 'fs.token.space.gap.8'}]
    if lid == 'fs.section.cta': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}]
    comps.append(c)
dsc = {'dsc': '0.1', 'id': 'fs.ds.relume-default', 'revision': '', 'createdAt': '2026-10-17T17:30:00Z',
       'provenance': [{'kind': 'relume-library-mcp', 'retrievedAt': '2026-10-17T16:05:55Z', 'version': None, 'hash': None, 'licence': 'unverified', 'note': 'values only; no Relume source in this repository (OD-25/OD-37)'},
                      {'kind': 'claude-design', 'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'file': 'project/tokens.json', 'hash': 'sha256:5781caed9fab3882ab070859354e6417d0e06d6677be9a4c49ffe280c10a4638', 'version': 2},
                      {'kind': 'penpot', 'fileId': ser['file']['id'], 'tokenSets': [s['id'] for s in ser['tokenSets'] if s['name'] in ('PEN-CLOUD-02 relume', 'PC03 claude-design')], 'structureCapturedAt': struct['capturedAt']}],
       'tokens': {'sets': [{'id': 'fs.tokens.relume', 'active': True, 'external': {'penpotSetId': relume['id']}}], 'entries': entries},
       'breakpoints': [{'id': 'lg', 'minWidth': 1024, 'canvas': 1440, 'container': 1280, 'sidePadding': '5%'}, {'id': 'md', 'minWidth': 768, 'canvas': 768, 'container': 691, 'sidePadding': '5%'}, {'id': 'sm', 'minWidth': 0, 'canvas': 375, 'container': 337, 'sidePadding': '5%'}],
       'typography': {'family': 'fs.token.font.family.sans', 'fonts': 'inputs/fonts/MANIFEST.json (Source Sans 3, OFL 1.1, OD-40)'},
       'components': comps,
       'acceptance': {'tokenFidelity': 'every binding resolves to the token value at the target breakpoint', 'identity': 'every component and token has an fs.* id and at least one external reference'}}
canon = json.dumps(dsc, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
dsc['revision'] = 'sha256:' + hashlib.sha256(canon).hexdigest()
out = root / 'inputs/dsc/fs.ds.relume-default.r1.json'
out.write_text(json.dumps(dsc, indent=1, ensure_ascii=False) + '\n')
print(dsc['revision'], 'entries', len(entries), 'components', len(comps))
