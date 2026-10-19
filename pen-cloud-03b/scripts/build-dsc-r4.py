#!/usr/bin/env python3
"""Deterministic DSC r4 builder (specification changes DSC-R4-01..05, owner ruling OD-50 Penpot reconciliation): Penpot serialisation + PEN-CLOUD-02/03 mappings -> fs.ds.relume-default.r4.json.
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
# DSC-R4-01/03/05: text column width, mobile quote-card gap and tier-aware grid gap; no Penpot token exists for them
for n, kind, v, resp, ext in [('size.text-column.max', 'sizing', '768px', None, 'max-w-lg (preset maxWidth.lg = 48rem)'), ('space.gap.5', 'spacing', '20px', None, 'gap-5 / mb-5 / mt-5'), ('space.grid.gap', 'spacing', '32px', {'sm': '24px'}, 'gap-6 md:gap-8')]:
    e = {'id': 'fs.token.' + n, 'type': kind, 'value': v, 'set': 'fs.tokens.relume', 'external': {'penpot': None, 'relume': ext}}
    if resp: e['responsive'] = resp
    entries.append(e)
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
# DSC-R4-04 (D-13): column inset and column-resolved aspect
hero_spec['imageLayout']['columnInset'] = 'layout.sidePadding'
hero_spec['imageLayout']['aspectBase'] = 'column'
hero_spec['imageLayout']['aspectBaseRule'] = "the 120% aspect resolves against the column's width, i.e. the widest image of that column at that tier, so every image in a column has the same height (1.2 x widest width; left column 30vw / 28vw / 22vw and right column 28vw / 26vw / 20vw at sm / md / lg); below screens.sm the minHeightBelowScreen rule still applies on top"
hero_spec['imageLayout']['columnInsetRule'] = "the left column's left edge and the right column's right edge sit at the section's side padding (5% of the section width); vw offsets inside the columns are unchanged"
nav_spec = json.loads(ser['boards']['desktop']['sections'][0]['pluginData']['foundation.animationSpec'])
comps = []
# DSC-R4-02 (D-14): padding-and-border button sizing
BTN_GEOMETRY = {'height': 50, 'paddingX': 24, 'paddingY': 12, 'gap': 12, 'strokeWidth': 1, 'labelLineHeight': 24, 'sizing': 'padding'}
BTN_SIZING_RULE = 'border-box height = paddingY x 2 + labelLineHeight + strokeWidth x 2 = 50; width = paddingX x 2 + label width + strokeWidth x 2; a generator emits padding and border, never a fixed height'
prim = ser['main_Button_Button_Primary']; sec = ser['main_Button_Button_Secondary']
comps.append({'id': 'fs.component.button.primary', 'kind': 'primitive', 'external': {'relume': {'primitive': 'button', 'variant': 'default', 'size': 'default'}, 'claudeDesign': {'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'component': 'Button', 'props': {'variant': 'primary'}}, 'penpot': {'componentId': '4d569422-e5e3-8076-8008-cdeb5017d341', 'mainShapeId': prim['id']}},
              'bindings': [{'property': 'fill', 'token': 'fs.token.color.neutral.darkest'}, {'property': 'strokeColor', 'token': 'fs.token.color.scheme.border'}, {'property': 'labelFill', 'token': 'fs.token.color.scheme.btn-text'}, {'property': 'borderRadius', 'token': 'fs.token.radius.button'}, {'property': 'labelFontSize', 'token': 'fs.token.font.size.regular'}],
              'geometry': BTN_GEOMETRY, 'sizingRule': BTN_SIZING_RULE, 'dependencies': [{'name': 'class-variance-authority', 'range': '0.7.1'}, {'name': '@radix-ui/react-slot', 'range': '*'}]})
comps.append({'id': 'fs.component.button.secondary', 'kind': 'primitive', 'external': {'relume': {'primitive': 'button', 'variant': 'secondary', 'size': 'default'}, 'claudeDesign': {'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'component': 'Button', 'props': {'variant': 'secondary'}}, 'penpot': {'componentId': '4d569422-e5e3-8076-8008-cdeb501973cd', 'mainShapeId': sec['id']}},
              'bindings': [{'property': 'fill', 'token': 'fs.token.color.scheme.foreground'}, {'property': 'strokeColor', 'token': 'fs.token.color.scheme.border'}, {'property': 'labelFill', 'token': 'fs.token.color.scheme.text'}, {'property': 'borderRadius', 'token': 'fs.token.radius.button'}, {'property': 'labelFontSize', 'token': 'fs.token.font.size.regular'}],
              'geometry': BTN_GEOMETRY, 'sizingRule': BTN_SIZING_RULE, 'dependencies': [{'name': 'class-variance-authority', 'range': '0.7.1'}]})
for lid, name, slug in sections:
    c = {'id': lid, 'kind': 'section', 'external': {'relume': {'slug': slug, 'version': None, 'hash': None}, 'penpot': section_ids(name)}, 'responsive': {'lg': {'canvas': 1440}, 'md': {'canvas': 768}, 'sm': {'canvas': 375}}, 'bindings': [{'property': 'paddingTop', 'token': 'fs.token.space.section.lg'}, {'property': 'paddingBottom', 'token': 'fs.token.space.section.lg'}, {'property': 'background', 'token': 'fs.token.color.scheme.background'}] if lid != 'fs.section.navbar' else [{'property': 'background', 'token': 'fs.token.color.scheme.background'}], 'dependencies': []}
    if lid == 'fs.section.hero':
        c['interaction'] = hero_spec; c['responsive']['sm']['initialTransform'] = '-12.5%'; c['dependencies'] = [{'name': 'motion', 'range': '^12.15.0'}]
        c['bindings'] = [{'property': 'background', 'token': 'fs.token.color.scheme.background'}, {'property': 'headingFontSize', 'token': 'fs.token.font.size.h1'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}, {'property': 'textPaddingTop', 'token': 'fs.token.space.hero.text-top'}, {'property': 'textPaddingBottom', 'token': 'fs.token.space.hero.text-bottom'}]
        c['layout'] = {'textBlock': {'verticalAlign': 'center', 'paddingTopBinding': 'textPaddingTop', 'paddingBottomBinding': 'textPaddingBottom', 'rule': "the text block is vertically centred inside the sticky stage's padded content box (stage height minus paddingTop and paddingBottom), so an asymmetric padding shifts the block by half the difference"}}
    if lid == 'fs.section.navbar': c['interaction'] = nav_spec; c['dependencies'] = [{'name': 'motion', 'range': '^12.15.0'}]
    if lid == 'fs.section.features': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'itemHeadingFontSize', 'token': 'fs.token.font.size.h4'}, {'property': 'gridGap', 'token': 'fs.token.space.gap.8'}, {'property': 'dividerColor', 'token': 'fs.token.color.scheme.border'}]
    if lid == 'fs.section.testimonials': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'cardBorder', 'token': 'fs.token.color.scheme.border'}, {'property': 'cardFill', 'token': 'fs.token.color.scheme.foreground'}, {'property': 'cardRadius', 'token': 'fs.token.radius.card'}, {'property': 'gridGap', 'token': 'fs.token.space.grid.gap'}]
    if lid == 'fs.section.testimonials': c['layout'] = {'grid': {'track': 'minmax(0, 1fr)', 'rules': [{'screen': None, 'columns': 1, 'rows': 'auto'}, {'screen': 'sm', 'rows': 4}, {'screen': 'md', 'columns': 2}, {'screen': 'lg', 'columns': 4, 'rows': 2}], 'quoteCardSpan': {'fromScreen': 'sm', 'columns': 2}, 'orderBelowScreen': {'screen': 'lg', 'cardIndex': 2, 'order': 'last'}, 'rowSizing': "explicit rows are equal fr tracks: every row in the template takes the tallest row's content height and cards stretch to the row (align-items: stretch); below sm there is no row template and rows are auto", 'provenance': 'Relume Testimonial37 responsive model: grid gap-6 sm:grid-rows-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:grid-rows-2; quote card sm:col-span-2; quote card index 2 order-last lg:order-none'}}
    if lid == 'fs.section.testimonials': c['layout']['quoteCard'] = {'starsGapBelow': {'sm': 'fs.token.space.gap.5', 'md': 'fs.token.space.gap.6'}, 'quoteGapBelow': {'sm': 'fs.token.space.gap.5', 'md': 'fs.token.space.gap.6'}, 'author': {'sm': {'direction': 'column', 'align': 'start', 'gap': '0'}, 'md': {'direction': 'row', 'align': 'center', 'gap': 'observation'}}, 'note': 'tier keys are the design tiers (sm = below 768, md = 768 and above incl. lg); the md/lg author gap stays a design observation (Penpot Author.gap); only the sm tier is governed in r4'}
    if lid == 'fs.section.cta': c['bindings'] += [{'property': 'headingFontSize', 'token': 'fs.token.font.size.h2'}, {'property': 'descriptionFontSize', 'token': 'fs.token.font.size.medium'}, {'property': 'buttonGap', 'token': 'fs.token.space.gap.4'}]
    if lid in ('fs.section.hero', 'fs.section.features', 'fs.section.testimonials', 'fs.section.cta'): c['bindings'].append({'property': 'textColumnMaxWidth', 'token': 'fs.token.size.text-column.max'})
    comps.append(c)
r3 = json.load(open(root / 'inputs/dsc/fs.ds.relume-default.r3.json'))
r4struct = root / 'inputs/penpot/structure.r4.json'
r4captured = json.load(open(r4struct))['capturedAt'] if r4struct.exists() else 'pending'
EV = 'PEN-CLOUD-03-B run r3 defect attribution %s; owner ruling OD-50 (Penpot reconciliation); %s'
dsc = {'dsc': '0.1', 'id': 'fs.ds.relume-default', 'revision': '', 'createdAt': '2026-10-19T12:00:00Z', 'supersedes': r3['revision'],
       'changeLog': [
           {'kind': 'specification', 'id': 'DSC-R4-01', 'change': 'Text column width. Added token fs.token.size.text-column.max (768px) and binding textColumnMaxWidth on fs.section.hero, fs.section.features, fs.section.testimonials and fs.section.cta. The section text column (hero text block, features header, testimonials header, CTA container) is min(container width, 768 px), centred where the section centres it and left-aligned in the features section; this replaces the 512 px design observation (Tailwind default max-w-lg) that the Penpot boards carried and that r1-r3 consumed; the boards are reconciled under OD-50.', 'evidence': EV % ('D-11', 'Relume preset maxWidth.lg = 48rem (max-w-lg)')},
           {'kind': 'specification', 'id': 'DSC-R4-02', 'change': 'Button sizing. fs.component.button.primary and fs.component.button.secondary geometry is now height 50, paddingX 24, paddingY 12, gap 12, strokeWidth 1, labelLineHeight 24, sizing padding, with a sizingRule. Relume px-6 py-3 with a 1 px border and the 24 px body line height renders 50 px tall; the Penpot mains were 48 px with an inner stroke and are reconciled (inner stroke represented inside the padding: 13/25 px) under OD-50.', 'evidence': EV % ('D-14', 'Relume class rule px-6 py-3 with border')},
           {'kind': 'specification', 'id': 'DSC-R4-03', 'change': 'Mobile quote-card spacing. Added token fs.token.space.gap.5 (20px) and a quoteCard rule in fs.section.testimonials layout. Relume stacks the author block below md (flex-col items-start, no gap) and uses mb-5/mt-5 (20 px) around the quote below md and mb-6/mt-6 (24 px) from md; the Penpot mobile board carried a row author block with a 16 px gap and 24 px spaces and is reconciled under OD-50.', 'evidence': EV % ('D-15', 'Relume class rule flex-col items-start, mb-5/mt-5 md:mb-6/md:mt-6')},
           {'kind': 'specification', 'id': 'DSC-R4-04', 'change': "Hero image columns. fs.section.hero interaction.imageLayout gains columnInset (layout.sidePadding), aspectBase (column), aspectBaseRule and columnInsetRule. Relume's columns are absolutely positioned inside a section with 5 % side padding, and percentage padding resolves against the shrink-wrapped column; r1-r3 placed the columns at the stage edge and resolved the aspect per image; the Penpot boards are reconciled under OD-50.", 'evidence': EV % ('D-13', 'Relume class rule pt-[120%] in absolutely positioned columns')},
           {'kind': 'specification', 'id': 'DSC-R4-05', 'change': 'Tier-aware grid gap. Added token fs.token.space.grid.gap (32px; sm 24px) and rebound the fs.section.testimonials gridGap binding to it (features gridGap stays on fs.token.space.gap.8). The testimonial grid gap is 24 px below md and 32 px from md; the Penpot mobile board already carries 24 px.', 'evidence': EV % ('D-12', 'Relume class rule gap-6 md:gap-8')}],
       'provenance': [{'kind': 'relume-library-mcp', 'retrievedAt': '2026-10-17T16:05:55Z', 'version': None, 'hash': None, 'licence': 'unverified', 'note': 'values only; no Relume source in this repository (OD-25/OD-37)'},
                      {'kind': 'claude-design', 'artifact': 'NsJsQNro6mtQS5B6xp4uXx', 'file': 'project/tokens.json', 'hash': 'sha256:5781caed9fab3882ab070859354e6417d0e06d6677be9a4c49ffe280c10a4638', 'version': 2},
                      {'kind': 'penpot', 'fileId': ser['file']['id'], 'tokenSets': [s['id'] for s in ser['tokenSets'] if s['name'] in ('PEN-CLOUD-02 relume', 'PC03 claude-design')], 'structureCapturedAt': struct['capturedAt']},
                      {'kind': 'penpot-reconciliation', 'ruling': 'OD-50', 'record': 'PEN-CLOUD-03-B-R4-RESULT.md', 'correctedStructure': 'inputs/penpot/structure.r4.json', 'capturedAt': r4captured}],
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
out = root / 'inputs/dsc/fs.ds.relume-default.r4.json'
out.write_text(json.dumps(dsc, indent=1, ensure_ascii=False) + '\n')
print(dsc['revision'], 'entries', len(entries), 'components', len(comps))
