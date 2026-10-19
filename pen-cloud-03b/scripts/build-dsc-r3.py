#!/usr/bin/env python3
"""Deterministic DSC r3 builder (specification changes DSC-R3-01..04): Penpot serialisation + PEN-CLOUD-02/03 mappings -> fs.ds.relume-default.r3.json.
Canonical JSON (sorted keys, no whitespace) is hashed with the `revision` field empty; the file is then written pretty-printed with the revision filled in. Re-running produces byte-identical output."""
import json, hashlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parents[1]
ser = json.load(open(root / 'inputs/penpot/serialisation.json'))
struct = json.load(open(root / 'inputs/penpot/structure.json'))
relume = next(s for s in ser['tokenSets'] if s['name'] == 'PEN-CLOUD-02 relume')
PX = lambda v: f"{int(float(v))}px" if float(v) == int(float(v)) else f"{v}px"
TYPE = {'color': 'color', 'fontSizes': 'fontSize', 'spacing': 'spacing', 'borderRadius': 'borderRadius'}
# per-breakpoint overrides from the Relume preset / component rules (desktop ramp is the token value)
RESP = {'space.section.lg': {'md': '96px', 'sm': '64px'}}
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
# hero text-block spacing the Relume model defines (DSC-R3-03); no Penpot token exists for them
for n, v, resp, ext in [('space.hero.text-top', '112px', {'md': '96px', 'sm': '64px'}, 'pt-16 md:pt-24 lg:py-28'), ('space.hero.text-bottom', '112px', {'md': '96px'}, 'pb-24 lg:py-28')]:
    entries.append({'id': 'fs.token.' + n, 'type': 'spacing', 'value': v, 'set': 'fs.tokens.relume', 'external': {'penpot': None, 'relume': ext}, 'responsive': resp})
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
hero_spec['imageLayout']['minHeightBelowScreen'] = {'screen': 'sm', 'value': '35vw'}
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
        c['bindings'] = [{'property': 'background', 'token': 'fs.token.color.scheme.background'}, {'property': 'headingFontSize', 'token': 'fs.token.font.size.h1'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}, {'property': 'textPaddingTop', 'token': 'fs.token.space.hero.text-top'}, {'property': 'textPaddingBottom', 'token': 'fs.token.space.hero.text-bottom'}]
        c['layout'] = {'textBlock': {'verticalAlign': 'center', 'paddingTopBinding': 'textPaddingTop', 'paddingBottomBinding': 'textPaddingBottom', 'rule': "the text block is vertically centred inside the sticky stage's padded content box (stage height minus paddingTop and paddingBottom), so an asymmetric padding shifts the block by half the difference"}}
    if lid == 'fs.section.navbar': c['interaction'] = nav_spec; c['dependencies'] = [{'name': 'motion', 'range': '^12.15.0'}]
    if lid == 'fs.section.features': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'itemHeadingFontSize', 'token': 'fs.token.font.size.h4'}, {'property': 'gridGap', 'token': 'fs.token.space.gap.8'}, {'property': 'dividerColor', 'token': 'fs.token.color.scheme.border'}]
    if lid == 'fs.section.testimonials': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'cardBorder', 'token': 'fs.token.color.scheme.border'}, {'property': 'cardFill', 'token': 'fs.token.color.scheme.foreground'}, {'property': 'cardRadius', 'token': 'fs.token.radius.card'}, {'property': 'gridGap', 'token': 'fs.token.space.gap.8'}]
    if lid == 'fs.section.testimonials': c['layout'] = {'grid': {'track': 'minmax(0, 1fr)', 'rules': [{'screen': None, 'columns': 1, 'rows': 'auto'}, {'screen': 'sm', 'rows': 4}, {'screen': 'md', 'columns': 2}, {'screen': 'lg', 'columns': 4, 'rows': 2}], 'quoteCardSpan': {'fromScreen': 'sm', 'columns': 2}, 'orderBelowScreen': {'screen': 'lg', 'cardIndex': 2, 'order': 'last'}, 'rowSizing': "explicit rows are equal fr tracks: every row in the template takes the tallest row's content height and cards stretch to the row (align-items: stretch); below sm there is no row template and rows are auto", 'provenance': 'Relume Testimonial37 responsive model: grid gap-6 sm:grid-rows-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:grid-rows-2; quote card sm:col-span-2; quote card index 2 order-last lg:order-none'}}
    if lid == 'fs.section.cta': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}]
    comps.append(c)
r2 = json.load(open(root / 'inputs/dsc/fs.ds.relume-default.r2.json'))
dsc = {'dsc': '0.1', 'id': 'fs.ds.relume-default', 'revision': '', 'createdAt': '2026-10-19T00:00:00Z', 'supersedes': r2['revision'],
       'changeLog': [
           {'kind': 'specification', 'id': 'DSC-R3-01', 'change': 'Breakpoint model. Added top-level `screens` (Relume Tailwind preset theme.screens sm 480 / md 768 / lg 992 / xl 1280 / xxl 1440 with the matching theme.container.screens widths: sm 100%, md 100%, lg 992px, xl 1280px; container centred, 100% below sm, side padding 5% at every width) and `screensProvenance`. `breakpoints` keeps its three design tiers (the three Penpot canvases 1440/768/375) and their ids; lg.minWidth corrected from 1024 to 992, a `screen` field added to each (lg -> lg, md -> md, sm -> null) and `breakpointsNote` added to state that breakpoints are design tiers while the width-dependent container rule is screens[].container.', 'evidence': 'PEN-CLOUD-03-B run r2 defect attribution D-3; Relume preset @relume_io/relume-tailwind 1.3.0 theme.screens and theme.container.screens'},
           {'kind': 'specification', 'id': 'DSC-R3-02', 'change': 'Hero image height rule. fs.section.hero interaction.imageLayout gains minHeightBelowScreen {screen: sm, value: 35vw}: below screens.sm (480px) every hero image box has min-height 35vw in addition to its 120% aspect padding (Relume `h-[35vw] pt-[120%] sm:h-auto` under border-box sizing, so the rendered height is max(35vw, 1.2 x width)); from sm the aspect alone applies. PEN-CLOUD-02 omitted this rule from the stored animation spec, and the r2 result record mis-stated the threshold as 640px; the preset sm screen is 480px.', 'evidence': 'PEN-CLOUD-03-B run r2 defect attribution D-4; Relume preset @relume_io/relume-tailwind 1.3.0 theme.screens.sm'},
           {'kind': 'specification', 'id': 'DSC-R3-03', 'change': 'Hero text block. Added spacing tokens fs.token.space.hero.text-top (112px; md 96px; sm 64px) and fs.token.space.hero.text-bottom (112px; md 96px; sm inherits md), bindings textPaddingTop and textPaddingBottom on fs.section.hero, and a layout.textBlock rule. The Relume model places the hero text in a full-height flex container with items-center and padding pt-16 pb-24 (sm), pt-24 pb-24 (md), py-28 (lg); r1/r2 centred the text in the full stage with no padding.', 'evidence': 'PEN-CLOUD-03-B run r2 defect attribution D-4; Relume preset @relume_io/relume-tailwind 1.3.0 spacing scale (pt-16, pt-24, pb-24, py-28)'},
           {'kind': 'specification', 'id': 'DSC-R3-04', 'change': 'Testimonials grid. fs.section.testimonials gains layout.grid: minmax(0, 1fr) tracks; cumulative mobile-first rules (base 1 column / auto rows; from sm 4 rows; from md 2 columns; from lg 4 columns and 2 rows); quote card spans 2 columns from sm; card index 2 is ordered last below lg; explicit rows are equal fr tracks with cards stretched. With a four-row template and no explicit columns, a two-column span forces the implicit grid to two columns from sm; r1/r2 emitted explicit columns only and no row template.', 'evidence': 'PEN-CLOUD-03-B run r2 defect attribution D-5; Relume preset @relume_io/relume-tailwind 1.3.0 theme.screens (Testimonial37 responsive classes)'}],
       'provenance': [{'kind': 'relume-library-mcp', 'retrievedAt': '2026-10-17T16:05:55Z', 'version': None, 'hash': None, 'licence': 'unverified', 'note': 'values only; no Relume source in this repository (OD-25/OD-37)'},
                      {'kind': 'claude-design', 'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'file': 'project/tokens.json', 'hash': 'sha256:5781caed9fab3882ab070859354e6417d0e06d6677be9a4c49ffe280c10a4638', 'version': 2},
                      {'kind': 'penpot', 'fileId': ser['file']['id'], 'tokenSets': [s['id'] for s in ser['tokenSets'] if s['name'] in ('PEN-CLOUD-02 relume', 'PC03 claude-design')], 'structureCapturedAt': struct['capturedAt']}],
       'tokens': {'sets': [{'id': 'fs.tokens.relume', 'active': True, 'external': {'penpotSetId': relume['id']}}], 'entries': entries},
       'screens': [{'id': 'sm', 'minWidth': 480, 'container': '100%'}, {'id': 'md', 'minWidth': 768, 'container': '100%'}, {'id': 'lg', 'minWidth': 992, 'container': '992px'}, {'id': 'xl', 'minWidth': 1280, 'container': '1280px'}, {'id': 'xxl', 'minWidth': 1440, 'container': '1280px'}],
       'screensProvenance': '@relume_io/relume-tailwind 1.3.0 dist/tailwind.config.js theme.screens and theme.container.screens; container below sm is 100%; side padding 5% at every width',
       'breakpoints': [{'id': 'lg', 'minWidth': 992, 'screen': 'lg', 'canvas': 1440, 'container': 1280, 'sidePadding': '5%'}, {'id': 'md', 'minWidth': 768, 'screen': 'md', 'canvas': 768, 'container': 691, 'sidePadding': '5%'}, {'id': 'sm', 'minWidth': 0, 'screen': None, 'canvas': 375, 'container': 337, 'sidePadding': '5%'}],
       'breakpointsNote': 'breakpoints are the three design tiers (Penpot canvases 1440/768/375) used for observations and token overrides; their container field is the container width measured on that canvas. The width-dependent container rule is screens[].container (992px from lg, 1280px from xl, 100% below lg).',
       'typography': {'family': 'fs.token.font.family.sans', 'fonts': 'inputs/fonts/MANIFEST.json (Source Sans 3, OFL 1.1, OD-40)'},
       'components': comps,
       'acceptance': {'tokenFidelity': 'every binding resolves to the token value at the target breakpoint', 'identity': 'every component and token has an fs.* id and at least one external reference'}}
canon = json.dumps(dsc, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
dsc['revision'] = 'sha256:' + hashlib.sha256(canon).hexdigest()
out = root / 'inputs/dsc/fs.ds.relume-default.r3.json'
out.write_text(json.dumps(dsc, indent=1, ensure_ascii=False) + '\n')
print(dsc['revision'], 'entries', len(entries), 'components', len(comps))
