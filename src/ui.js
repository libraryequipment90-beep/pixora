import { BLEND_MODES, BLEND_LABELS, fxActive } from './engine.js'
import { TOOL_GROUPS, ICONS, toolById, groupForTool } from './tools.js'
import { FILTER_MENU } from './filters.js'

export function hsvToRgb(h, s, v) {
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)]
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('')
}

export function hexToHsv(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let hue = 0
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  return { h: hue, s: max ? d / max : 0, v: max }
}

function menuItemEl(item, wrap, light = false) {
  if (item.hr) return document.createElement('hr')
  if (item.sub) {
    const row = document.createElement('div')
    row.className = 'menu-sub'
    row.innerHTML = `<span class="chk"></span><span>${item.label}</span><span class="menu-caret">›</span>`
    const nested = document.createElement('div')
    nested.className = 'dropdown nested' + (light ? ' light' : '')
    item.sub.forEach(s => nested.appendChild(menuItemEl(s, wrap, light)))
    row.appendChild(nested)
    return row
  }
  const b = document.createElement('button')
  b.type = 'button'
  b.className = item.dim ? 'dim' : ''
  const chk = item.check != null ? `<span class="chk">${item.on ? '✓' : ''}</span>` : (light ? '<span class="chk"></span>' : '')
  b.innerHTML = `${chk}<span>${item.label}</span><span class="kbd">${item.kbd || ''}</span>`
  b.addEventListener('click', e => {
    e.stopPropagation()
    wrap.classList.remove('open')
    document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'))
    item.fn?.()
  })
  return b
}

export function buildMenus(app) {
  const v = app.view
  const menus = [
    {
      name: 'File',
      items: [
        { label: 'New Project…', kbd: 'Ctrl+N', fn: () => app.newDocDialog() },
        { label: 'Open…', kbd: 'Ctrl+O', fn: () => app.openFile() },
        { label: 'Place Embedded…', fn: () => app.placeFile() },
        { hr: true },
        { label: 'Save Project', kbd: 'Ctrl+S', fn: () => app.saveProject() },
        { label: 'Export Image…', kbd: 'Ctrl+Shift+S', fn: () => app.exportDialog() },
        { label: 'Export as PNG', fn: () => app.exportImage('png') },
        { label: 'Export as JPEG', fn: () => app.exportImage('jpeg') },
        { label: 'Export as WEBP', fn: () => app.exportImage('webp') }
      ]
    },
    {
      name: 'Edit',
      items: [
        { label: 'Undo', kbd: 'Ctrl+Z', fn: () => app.doc.undo() },
        { label: 'Redo', kbd: 'Ctrl+Shift+Z', fn: () => app.doc.redo() },
        { hr: true },
        { label: 'Cut', kbd: 'Ctrl+X', fn: () => app.cut() },
        { label: 'Copy', kbd: 'Ctrl+C', fn: () => app.copy() },
        { label: 'Paste as New Layer', kbd: 'Ctrl+V', fn: () => app.paste() },
        { hr: true },
        { label: 'Fill…', kbd: 'Shift+F5', fn: () => app.fillDialog() },
        { label: 'Stroke…', fn: () => app.strokeDialog() },
        { label: 'Fill with Foreground', kbd: 'Alt+Backspace', fn: () => app.doc.fillSelection(app.doc.fg) },
        { label: 'Fill with Background', kbd: 'Ctrl+Backspace', fn: () => app.doc.fillSelection(app.doc.bg) },
        { label: 'Clear', kbd: 'Del', fn: () => app.doc.clearSelection() },
        { hr: true },
        { label: 'Free Transform', kbd: 'Ctrl+T', fn: () => { app.tools.state.showTransform = true; app.setTool('move'); app.renderOverlay() } }
      ]
    },
    {
      name: 'Image',
      items: [
        { label: 'Image Size…', fn: () => app.imageSizeDialog() },
        { label: 'Canvas Size…', fn: () => app.canvasSizeDialog() },
        { label: 'Crop', fn: () => app.cropSelection() },
        { hr: true },
        { label: 'Image Rotation 90° CW', fn: () => app.rotate(90) },
        { label: 'Image Rotation 90° CCW', fn: () => app.rotate(-90) },
        { label: 'Image Rotation 180°', fn: () => app.rotate(180) },
        { label: 'Flip Horizontal', fn: () => app.flip(true) },
        { label: 'Flip Vertical', fn: () => app.flip(false) }
      ]
    },
    {
      name: 'Layer',
      items: [
        { label: 'New Layer', kbd: 'Ctrl+Shift+N', fn: () => { app.doc.addLayer(); app.doc.pushHistory('New Layer'); app.render() } },
        { label: 'New Fill Layer', fn: () => app.doc.addFillLayer(app.doc.fg) },
        { label: 'Duplicate Layer', kbd: 'Ctrl+J', fn: () => app.doc.duplicateLayer() },
        { label: 'Layer via Copy', kbd: 'Ctrl+Shift+J', fn: () => app.doc.layerViaCopy(false) },
        { label: 'Layer via Cut', kbd: 'Ctrl+Shift+J', fn: () => app.doc.layerViaCopy(true) },
        { label: 'Delete Layer', kbd: 'Del', fn: () => app.doc.deleteLayer() },
        { hr: true },
        { label: 'Group Layers', kbd: 'Ctrl+G', fn: () => { app.doc.groupSelected(); app.render() } },
        { label: 'Ungroup Layers', kbd: 'Ctrl+Shift+G', fn: () => { app.doc.ungroup(); app.render() } },
        { hr: true },
        { label: 'Add Layer Mask', fn: () => app.doc.addMask() },
        { label: 'Delete Layer Mask', fn: () => app.doc.deleteMask() },
        { label: 'Apply Layer Mask', fn: () => app.doc.applyMask() },
        { label: 'Disable/Enable Mask', fn: () => app.doc.disableMask() },
        { label: 'Create Clipping Mask', kbd: 'Ctrl+Alt+G', fn: () => app.doc.toggleClip() },
        { hr: true },
        { label: 'Layer Style…', fn: () => app.layerStyleDialog() },
        { label: 'Drop Shadow', fn: () => app.layerStyleDialog('shadow') },
        { label: 'Stroke', fn: () => app.layerStyleDialog('stroke') },
        { label: 'Color Overlay', fn: () => app.layerStyleDialog('overlay') },
        { label: 'Outer Glow', fn: () => app.layerStyleDialog('glow') },
        { hr: true },
        { label: 'Merge Layers', kbd: 'Ctrl+E', fn: () => app.doc.mergeSelected() },
        { label: 'Merge Down', fn: () => app.doc.mergeDown() },
        { label: 'Merge Visible', kbd: 'Ctrl+Shift+E', fn: () => app.doc.mergeVisible() },
        { label: 'Flatten Image', fn: () => app.doc.flatten() },
        { hr: true },
        { label: 'Bring to Front', kbd: 'Ctrl+Shift+]', fn: () => app.doc.bringToFront() },
        { label: 'Bring Forward', kbd: 'Ctrl+]', fn: () => app.doc.moveLayer(1) },
        { label: 'Send Backward', kbd: 'Ctrl+[', fn: () => app.doc.moveLayer(-1) },
        { label: 'Send to Back', kbd: 'Ctrl+Shift+[', fn: () => app.doc.sendToBack() },
        { hr: true },
        { label: 'Hide Others', fn: () => { app.doc.hideOthers(); app.render() } },
        { label: 'Show All Layers', fn: () => { app.doc.showAll(); app.render() } }
      ]
    },
    {
      name: 'Select',
      items: [
        { label: 'All', kbd: 'Ctrl+A', fn: () => app.selectAll() },
        { label: 'Deselect', kbd: 'Ctrl+D', fn: () => { app.doc.selection = null; app.render(); app.renderOverlay() } },
        { label: 'Inverse', kbd: 'Ctrl+Shift+I', fn: () => app.invertSelection() },
        { label: 'Transform Selection', fn: () => { app.tools.state.selXf = true; app.setTool('marquee'); app.renderOverlay() } }
      ]
    },
    {
      name: 'Filter',
      items: FILTER_MENU.map(f => ({ label: f.label, fn: () => app.applyFilter(f.id) }))
    },
    {
      name: 'View',
      items: [
        { label: 'Zoom In', kbd: 'Ctrl + +', fn: () => app.setZoom(app.doc.zoom * 1.25) },
        { label: 'Zoom Out', kbd: 'Ctrl + -', fn: () => app.setZoom(app.doc.zoom * 0.8) },
        { label: 'Fit The Area', kbd: 'Ctrl + 0', fn: () => app.fitZoom() },
        { label: 'Pixel to Pixel', kbd: 'Ctrl + 1', fn: () => app.setZoom(1) },
        { label: 'Pattern Preview', dim: true, fn: () => {} },
        { hr: true },
        {
          label: 'Mode',
          sub: [
            { label: 'Standard Screen', fn: () => app.setScreenMode('standard') },
            { label: 'Full Screen', fn: () => app.setScreenMode('full') },
            { label: 'Full Screen with Menus', fn: () => app.setScreenMode('menus') }
          ]
        },
        { label: 'Extras', kbd: 'Ctrl + H', check: true, on: v.extras, fn: () => app.toggleView('extras') },
        {
          label: 'Show',
          sub: [
            { label: 'Layer Edges', check: true, on: v.layerEdges, fn: () => app.toggleView('layerEdges') },
            { label: 'Selection Edges', check: true, on: v.selEdges, fn: () => app.toggleView('selEdges') },
            { label: 'Guides', check: true, on: v.guides, fn: () => app.toggleView('guides') },
            { label: 'Grid', check: true, on: v.grid, fn: () => app.toggleView('grid') },
            { label: 'Slices', check: true, on: v.slices, fn: () => app.toggleView('slices') }
          ]
        },
        { hr: true },
        { label: 'Rulers', kbd: 'Ctrl + R', check: true, on: v.rulers, fn: () => app.toggleView('rulers') },
        { hr: true },
        { label: 'Snap', check: true, on: v.snap, fn: () => app.toggleView('snap') },
        {
          label: 'Snap To',
          sub: [
            { label: 'Guides', check: true, on: v.snapGuides, fn: () => app.toggleView('snapGuides') },
            { label: 'Grid', check: true, on: v.snapGrid, fn: () => app.toggleView('snapGrid') },
            { label: 'Layers', check: true, on: v.snapLayers, fn: () => app.toggleView('snapLayers') },
            { label: 'Document Bounds', check: true, on: v.snapBounds, fn: () => app.toggleView('snapBounds') }
          ]
        },
        { hr: true },
        { label: 'Lock Guides', check: true, on: v.lockGuides, fn: () => app.toggleView('lockGuides') },
        { label: 'Clear Guides', fn: () => app.clearGuides() },
        { label: 'Add Guides…', fn: () => app.addGuidesDialog() },
        { label: 'Guides from Layer', dim: true, fn: () => {} },
        { hr: true },
        { label: 'Clear Slices', dim: true, fn: () => {} }
      ]
    },
    {
      name: 'Window',
      items: [
        {
          label: 'More',
          sub: [
            { label: 'Actions', check: true, on: app.panels.actions, fn: () => app.togglePanel('actions') },
            { label: 'Brush', check: true, on: app.panels.brush, fn: () => app.togglePanel('brush') },
            { label: 'Channels', check: true, on: app.panels.channels, fn: () => app.togglePanel('channels') },
            { label: 'Character', check: true, on: app.panels.character, fn: () => app.togglePanel('character') },
            { label: 'Info', check: true, on: app.panels.info, fn: () => app.togglePanel('info') },
            { label: 'Navigator', check: true, on: app.panels.navigator, fn: () => app.togglePanel('navigator') },
            { label: 'Paragraph', check: true, on: app.panels.paragraph, fn: () => app.togglePanel('paragraph') },
            { label: 'Paths', check: true, on: app.panels.paths, fn: () => app.togglePanel('paths') },
            { label: 'Properties', check: true, on: app.panels.properties, fn: () => app.togglePanel('properties') }
          ]
        },
        { label: 'Plugins', fn: () => app.toast('No plugins installed') },
        { hr: true },
        { label: 'Actions', fn: () => app.togglePanel('actions') },
        { label: 'Adjustments', check: true, on: app.panels.adjust, fn: () => app.togglePanel('adjust') },
        { label: 'Brush', check: true, on: app.panels.brush, fn: () => app.togglePanel('brush') },
        { label: 'Channels', check: true, on: app.panels.channels, fn: () => app.togglePanel('channels') },
        { label: 'Character', check: true, on: app.panels.character, fn: () => app.togglePanel('character') },
        { label: 'Character Styles', fn: () => app.togglePanel('character') },
        { label: 'Color', check: true, on: app.panels.color, fn: () => app.togglePanel('color') },
        { label: 'Swatches', check: true, on: app.panels.swatches, fn: () => app.togglePanel('swatches') },
        { label: 'Glyphs', fn: () => app.toast('Glyphs panel is not available') },
        { label: 'Histogram', fn: () => app.toast('Histogram panel is not available') },
        { label: 'History', check: true, on: app.panels.history, fn: () => app.togglePanel('history') },
        { label: 'Info', check: true, on: app.panels.info, fn: () => app.togglePanel('info') },
        { label: 'Layers', check: true, on: app.panels.layers, fn: () => app.togglePanel('layers') },
        { label: 'Timeline', fn: () => app.toast('Timeline panel is not available') },
        { label: 'Layer Comps', fn: () => app.toast('Layer Comps panel is not available') },
        { label: 'Navigator', check: true, on: app.panels.navigator, fn: () => app.togglePanel('navigator') },
        { label: 'Notes', fn: () => app.toast('Notes panel is not available') },
        { label: 'Paragraph', check: true, on: app.panels.paragraph, fn: () => app.togglePanel('paragraph') },
        { label: 'Paths', check: true, on: app.panels.paths, fn: () => app.togglePanel('paths') },
        { label: 'Properties', check: true, on: app.panels.properties, fn: () => app.togglePanel('properties') }
      ]
    },
    {
      name: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', fn: () => app.helpDialog() },
        { label: 'Reset Workspace', fn: () => app.resetWorkspace() },
        { hr: true },
        { label: 'About Pixora', fn: () => app.aboutDialog() }
      ]
    }
  ]

  const root = document.getElementById('menus')
  root.innerHTML = ''
  menus.forEach(menu => {
    const wrap = document.createElement('div')
    wrap.className = 'menu-item'
    const btn = document.createElement('button')
    btn.className = 'menu-btn'
    btn.textContent = menu.name
    const drop = document.createElement('div')
    const light = menu.name === 'Window' || menu.name === 'View'
    drop.className = 'dropdown' + (light ? ' light' : '') + (menu.name === 'Window' ? ' tall' : '')
    menu.items.forEach(item => drop.appendChild(menuItemEl(item, wrap, light)))
    drop.addEventListener('click', e => e.stopPropagation())
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const was = wrap.classList.contains('open')
      root.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
      if (!was) wrap.classList.add('open')
    })
    wrap.appendChild(btn)
    wrap.appendChild(drop)
    root.appendChild(wrap)
  })
  if (!buildMenus._clickBound) {
    buildMenus._clickBound = true
    document.addEventListener('click', () => {
      root.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
    })
  }
}

export function buildToolbar(app) {
  const root = document.getElementById('toolbar')
  root.innerHTML = ''
  TOOL_GROUPS.forEach(group => {
    const current = group.tools.find(t => t.id === app.tool) || group.tools[0]
    const wrap = document.createElement('div')
    wrap.className = 'tool-slot' + (group.tools.some(t => t.id === app.tool) ? ' active' : '')
    wrap.dataset.group = group.id
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tool'
    b.dataset.tool = current.id
    b.title = `${current.label} (${current.key})`
    b.innerHTML = (ICONS[current.icon] || '') + (group.tools.length > 1 ? '<i class="fly-dot"></i>' : '')
    b.addEventListener('click', () => {
      const shown = group.tools.find(t => t.id === b.dataset.tool) || group.tools[0]
      app.setTool(shown.id)
    })
    wrap.appendChild(b)
    if (group.tools.length > 1) {
      const fly = document.createElement('div')
      fly.className = 'tool-fly'
      group.tools.forEach(t => {
        const item = document.createElement('button')
        item.type = 'button'
        item.innerHTML = `${ICONS[t.icon] || ''}<span>${t.label}</span><em>${t.key}</em>`
        item.addEventListener('click', (e) => {
          e.stopPropagation()
          b.dataset.tool = t.id
          b.title = `${t.label} (${t.key})`
          b.innerHTML = (ICONS[t.icon] || '') + '<i class="fly-dot"></i>'
          app.setTool(t.id)
        })
        fly.appendChild(item)
      })
      wrap.appendChild(fly)
    }
    root.appendChild(wrap)
  })

  const colors = document.createElement('div')
  colors.className = 'tb-colors'
  colors.innerHTML = `
    <button type="button" class="tb-fg" id="tb-fg" title="Foreground"></button>
    <button type="button" class="tb-bg" id="tb-bg" title="Background"></button>
    <button type="button" class="tb-swap" id="tb-swap" title="Swap (X)">⇄</button>
    <button type="button" class="tb-reset" id="tb-reset" title="Default (D)">▣</button>`
  root.appendChild(colors)
  colors.querySelector('#tb-fg').onclick = () => { app.colorTarget = 'fg'; app.hsv = hexToHsv(app.doc.fg); app.setFg(app.doc.fg) }
  colors.querySelector('#tb-bg').onclick = () => { app.colorTarget = 'bg'; app.hsv = hexToHsv(app.doc.bg); app.setBg(app.doc.bg) }
  colors.querySelector('#tb-swap').onclick = () => {
    const a = app.doc.fg; app.setFg(app.doc.bg); app.setBg(a)
  }
  colors.querySelector('#tb-reset').onclick = () => { app.setFg('#000000'); app.setBg('#ffffff') }
}

export function syncToolbar(app) {
  const root = document.getElementById('toolbar')
  if (!root) return
  const group = groupForTool(app.tool)
  root.querySelectorAll('.tool-slot').forEach(slot => {
    const g = TOOL_GROUPS.find(x => x.id === slot.dataset.group)
    const on = g?.tools.some(t => t.id === app.tool)
    slot.classList.toggle('active', !!on)
    if (on && group) {
      const t = toolById(app.tool)
      const b = slot.querySelector('.tool')
      if (t && b) {
        b.dataset.tool = t.id
        b.title = `${t.label} (${t.key})`
        b.innerHTML = (ICONS[t.icon] || '') + (g.tools.length > 1 ? '<i class="fly-dot"></i>' : '')
      }
    }
  })
  const fg = document.getElementById('tb-fg')
  const bg = document.getElementById('tb-bg')
  if (fg) fg.style.background = app.doc.fg
  if (bg) bg.style.background = app.doc.bg
}

export function renderOptions(app) {
  const bar = document.getElementById('optionsbar')
  const s = app.tools.state
  const tool = app.tool
  const meta = toolById(tool)
  const parts = [`<div class="opt"><b>${meta?.label || tool}</b></div><div class="sep"></div>`]
  const sizeTools = ['brush', 'pencil', 'eraser', 'clone', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'heal', 'pen', 'shape', 'ellipse', 'line', 'poly', 'history-brush']

  if (tool === 'history-brush') {
    parts.push(`<div class="opt">Paint to restore pixels from the original history state</div>`)
  }
  if (tool === 'row-marquee' || tool === 'col-marquee') {
    parts.push(`<div class="opt">Click to select a 1px ${tool === 'row-marquee' ? 'row' : 'column'}</div>`)
  }
  if (tool === 'magnetic-lasso') parts.push(`<div class="opt">Drag along edges to snap the lasso</div>`)
  if (tool === 'sampler') parts.push(`<div class="opt">Click to sample color and show coordinates</div>`)
  if (tool === 'slice') parts.push(`<div class="opt">Drag a slice box, then Enter to crop</div>`)
  if (sizeTools.includes(tool)) {
    parts.push(`<div class="opt"><label>Size</label><input id="opt-size" type="range" min="1" max="200" value="${s.brushSize}"><span>${s.brushSize}px</span></div>`)
    parts.push(`<div class="opt"><label>Hardness</label><input id="opt-hard" type="range" min="0" max="100" value="${s.hardness}"></div>`)
    parts.push(`<div class="opt"><label>Opacity</label><input id="opt-op" type="range" min="1" max="100" value="${s.opacity}"></div>`)
  }
  if (['shape', 'ellipse', 'line', 'poly'].includes(tool)) {
    parts.push(`<div class="opt"><label><input id="opt-fill" type="checkbox"${s.fillOn ? ' checked' : ''}> Fill</label></div>`)
    parts.push(`<div class="opt"><label><input id="opt-stroke" type="checkbox"${s.strokeOn ? ' checked' : ''}> Stroke</label></div>`)
  }
  if (tool === 'gradient') {
    parts.push(`<div class="opt"><label>Type</label>
      <select id="opt-grad">
        <option value="linear"${s.gradientType === 'linear' ? ' selected' : ''}>Linear</option>
        <option value="radial"${s.gradientType === 'radial' ? ' selected' : ''}>Radial</option>
      </select></div>`)
    parts.push(`<div class="opt"><label>Opacity</label><input id="opt-op" type="range" min="1" max="100" value="${s.opacity}"></div>`)
  }
  if (tool === 'text') {
    parts.push(`<div class="opt"><label>Font</label>
      <select id="opt-font">
        ${['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS'].map(f =>
          `<option${s.fontFamily === f ? ' selected' : ''}>${f}</option>`).join('')}
      </select></div>`)
    parts.push(`<div class="opt"><label>Size</label><input id="opt-fs" type="number" min="8" max="400" value="${s.fontSize}"></div>`)
    parts.push(`<div class="opt"><label><input id="opt-bold" type="checkbox"${s.textBold ? ' checked' : ''}> Bold</label></div>`)
    parts.push(`<div class="opt"><label><input id="opt-italic" type="checkbox"${s.textItalic ? ' checked' : ''}> Italic</label></div>`)
    parts.push(`<div class="opt">Click to type a new layer · double-click a T layer to re-edit · Enter to commit</div>`)
  }
  if (['wand', 'fill', 'magic-eraser'].includes(tool)) {
    parts.push(`<div class="opt"><label>Tolerance</label><input id="opt-tol" type="range" min="0" max="120" value="${s.wandTol}"><span>${s.wandTol}</span></div>`)
  }
  if (tool === 'move' || tool === 'path') {
    parts.push(`<div class="opt"><label><input id="opt-auto" type="checkbox"${s.autoSelect ? ' checked' : ''}> Auto-Select</label></div>`)
    parts.push(`<div class="opt"><select id="opt-auto-kind"><option>Layer</option><option>Group</option></select></div>`)
    parts.push(`<div class="opt"><label><input id="opt-xf" type="checkbox"${s.showTransform ? ' checked' : ''}> Transform controls</label></div>`)
    parts.push(`<div class="opt">Drag handles to scale · top circle to rotate · Shift constrain</div>`)
    parts.push(`<div class="opt"><label><input id="opt-dist" type="checkbox"${s.showDistances ? ' checked' : ''}> Distances</label></div>`)
    parts.push(`<div class="sep"></div>`)
    parts.push(`<div class="opt align-btns">
      <button type="button" data-align="left" title="Align Left">⇤</button>
      <button type="button" data-align="hcenter" title="Align Horizontal Centers">↔</button>
      <button type="button" data-align="right" title="Align Right">⇥</button>
      <button type="button" data-align="top" title="Align Top">⤒</button>
      <button type="button" data-align="vcenter" title="Align Vertical Centers">↕</button>
      <button type="button" data-align="bottom" title="Align Bottom">⤓</button>
    </div>`)
    parts.push(`<div class="opt align-btns">
      <button type="button" data-dist="h" title="Distribute Horizontally">⋯</button>
      <button type="button" data-dist="v" title="Distribute Vertically">⋮</button>
    </div>`)
  }
  if (tool === 'marquee' || tool === 'ellipse-marquee') parts.push(`<div class="opt">Drag handles to transform selection · Shift+click add · Alt subtract · Shift square</div>`)
  if (tool === 'crop') parts.push(`<div class="opt">Drag crop box, resize handles, Enter to apply, Esc to cancel</div>`)
  if (tool === 'clone') parts.push(`<div class="opt">Alt-click to set source, then paint</div>`)
  if (tool === 'fill') parts.push(`<div class="opt">Click an area to fill with foreground</div>`)
  if (tool === 'eyedropper') parts.push(`<div class="opt">Click: foreground · Shift-click: background</div>`)
  if (tool === 'heal') parts.push(`<div class="opt">Paint over spots to blend them</div>`)

  bar.innerHTML = parts.join('')
  bar.querySelector('#opt-size')?.addEventListener('input', e => { s.brushSize = +e.target.value; renderOptions(app) })
  bar.querySelector('#opt-hard')?.addEventListener('input', e => { s.hardness = +e.target.value })
  bar.querySelector('#opt-op')?.addEventListener('input', e => { s.opacity = +e.target.value })
  bar.querySelector('#opt-fill')?.addEventListener('change', e => { s.fillOn = e.target.checked })
  bar.querySelector('#opt-stroke')?.addEventListener('change', e => { s.strokeOn = e.target.checked })
  bar.querySelector('#opt-grad')?.addEventListener('change', e => { s.gradientType = e.target.value })
  bar.querySelector('#opt-font')?.addEventListener('change', e => {
    s.fontFamily = e.target.value
    if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  })
  bar.querySelector('#opt-fs')?.addEventListener('input', e => {
    s.fontSize = +e.target.value
    if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  })
  bar.querySelector('#opt-bold')?.addEventListener('change', e => {
    s.textBold = e.target.checked
    if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  })
  bar.querySelector('#opt-italic')?.addEventListener('change', e => {
    s.textItalic = e.target.checked
    if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  })
  bar.querySelector('#opt-tol')?.addEventListener('input', e => {
    s.wandTol = +e.target.value
    e.target.nextElementSibling.textContent = e.target.value
  })
  bar.querySelector('#opt-auto')?.addEventListener('change', e => { s.autoSelect = e.target.checked })
  bar.querySelector('#opt-xf')?.addEventListener('change', e => {
    s.showTransform = e.target.checked
    app.renderOverlay()
  })
  bar.querySelector('#opt-dist')?.addEventListener('change', e => {
    s.showDistances = e.target.checked
    app.renderOverlay()
  })
  bar.querySelectorAll('[data-align]').forEach(b => {
    b.onclick = () => { app.doc.alignLayer(b.dataset.align); app.render() }
  })
  bar.querySelectorAll('[data-dist]').forEach(b => {
    b.onclick = () => { app.doc.distributeLayers(b.dataset.dist); app.render() }
  })
}

function showLayerMenu(app, i, x, y) {
  document.querySelectorAll('.ctx-menu').forEach(el => el.remove())
  app.doc.active = i
  const layer = app.doc.layers[i]
  const menu = document.createElement('div')
  menu.className = 'ctx-menu'
  menu.style.left = x + 'px'
  menu.style.top = y + 'px'
  const items = [
    ['New Layer', () => { app.doc.addLayer(); app.doc.pushHistory('New Layer') }],
    ['Duplicate Layer', () => app.doc.duplicateLayer()],
    ['Delete Layer', () => app.doc.deleteLayer()],
    null,
    ['Group Layers', () => app.doc.groupSelected()],
    layer?.kind === 'group' ? ['Ungroup Layers', () => app.doc.ungroup(i)] : null,
    null,
    ['Add Layer Mask', () => app.doc.addMask()],
    layer?.mask ? ['Delete Layer Mask', () => app.doc.deleteMask()] : null,
    layer?.mask ? ['Apply Layer Mask', () => app.doc.applyMask()] : null,
    layer?.mask ? [(layer.maskEnabled === false ? 'Enable Mask' : 'Disable Mask'), () => app.doc.disableMask()] : null,
    [layer?.clip ? 'Release Clipping Mask' : 'Create Clipping Mask', () => app.doc.toggleClip()],
    null,
    ['Layer Style…', () => app.layerStyleDialog()],
    ['Stroke…', () => app.strokeDialog()],
    ['Fill…', () => app.fillDialog()],
    null,
    ['Merge Layers', () => app.doc.mergeSelected()],
    ['Merge Down', () => app.doc.mergeDown()],
    ['Merge Visible', () => app.doc.mergeVisible()],
    ['Flatten Image', () => app.doc.flatten()],
    null,
    ['Bring to Front', () => app.doc.bringToFront()],
    ['Bring Forward', () => app.doc.moveLayer(1)],
    ['Send Backward', () => app.doc.moveLayer(-1)],
    ['Send to Back', () => app.doc.sendToBack()],
    null,
    ['Hide Others', () => app.doc.hideOthers()],
    ['Show All Layers', () => app.doc.showAll()]
  ]
  items.forEach(item => {
    if (!item) {
      menu.appendChild(document.createElement('hr'))
      return
    }
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = item[0]
    b.onclick = () => { menu.remove(); item[1](); app.render() }
    menu.appendChild(b)
  })
  document.body.appendChild(menu)
  const close = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('pointerdown', close) }
  }
  setTimeout(() => document.addEventListener('pointerdown', close), 0)
}

function layerTypeIcon(layer) {
  if (layer.kind === 'group') {
    return '<span class="type-icon group-icon" title="Group"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M1.6 4.3a1.2 1.2 0 0 1 1.2-1.2h3.1l1.3 1.5h6a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H2.8a1.2 1.2 0 0 1-1.2-1.2z" fill="currentColor"/></svg></span>'
  }
  if (layer.kind === 'text') {
    return '<span class="type-icon text-icon" title="Text layer"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 3.4h10M8 3.4v9.2M6 12.6h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>'
  }
  return '<span class="type-icon layer-icon" title="Layer"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 1.9 13.8 5 8 8.1 2.2 5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.6 7.5 8 10.3l5.4-2.8M2.6 9.9 8 12.7l5.4-2.8" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/></svg></span>'
}

export function renderLayers(app) {
  const list = document.getElementById('layer-list')
  list.innerHTML = ''
  const depthOf = (layer) => {
    let depth = 0
    let pid = layer.parentId
    while (pid) {
      const parent = app.doc.layers.find(l => l.id === pid)
      if (!parent) break
      depth += 1
      pid = parent.parentId
    }
    return depth
  }
  app.doc.layers.forEach((layer, i) => {
    if (layer.parentId) {
      let pid = layer.parentId
      while (pid) {
        const parent = app.doc.layers.find(l => l.id === pid)
        if (!parent) break
        if (parent.collapsed) return
        pid = parent.parentId
      }
    }
    const depth = depthOf(layer)
    const selected = app.doc.selected?.has(layer.id)
    const li = document.createElement('li')
    li.className = 'layer-item' + (i === app.doc.active ? ' active' : '') + (selected && i !== app.doc.active ? ' selected' : '') + (layer.visible ? '' : ' hidden') + (layer.clip ? ' clipped' : '') + (layer.kind === 'group' ? ' group' : '') + (layer.parentId ? ' nested' : '')
    if (depth) li.style.paddingLeft = `${6 + depth * 14}px`
    li.draggable = true
    const thumb = document.createElement('canvas')
    thumb.width = 36
    thumb.height = 24
    const tctx = thumb.getContext('2d')
    tctx.fillStyle = '#222'
    tctx.fillRect(0, 0, 36, 24)
    if (layer.kind !== 'group') tctx.drawImage(layer.canvas, 0, 0, 36, 24)
    else {
      tctx.fillStyle = '#3a3a3a'
      tctx.fillRect(4, 6, 28, 14)
      tctx.strokeStyle = '#888'
      tctx.strokeRect(4.5, 6.5, 27, 13)
    }
    const toggle = layer.kind === 'group'
      ? `<span class="fold" title="Collapse">${layer.collapsed ? '▸' : '▾'}</span>`
      : '<span class="fold"></span>'
    li.innerHTML = `${toggle}<span class="eye" title="Visibility">${layer.visible ? '◉' : '○'}</span>${layerTypeIcon(layer)}`
    const thumbs = document.createElement('div')
    thumbs.className = 'layer-thumbs'
    thumbs.appendChild(thumb)
    if (layer.mask) {
      const mt = document.createElement('canvas')
      mt.className = 'mask-thumb' + (layer.maskEnabled === false ? ' off' : '')
      mt.width = 36
      mt.height = 24
      mt.title = layer.maskEnabled === false ? 'Mask disabled' : 'Layer mask'
      mt.getContext('2d').drawImage(layer.mask, 0, 0, 36, 24)
      mt.addEventListener('click', (e) => {
        e.stopPropagation()
        layer.maskEnabled = layer.maskEnabled === false
        app.render()
      })
      thumbs.appendChild(mt)
    }
    li.appendChild(thumbs)
    const mid = document.createElement('div')
    mid.className = 'layer-mid'
    const name = document.createElement('input')
    name.value = layer.name
     name.addEventListener('change', () => {
       layer.name = name.value
       app.doc.pushHistory('Rename Layer')
     })
    mid.appendChild(name)
    if (layer.kind === 'group') {
      const t = document.createElement('span')
      t.className = 'g-tag'
      t.textContent = 'G'
      t.title = 'Layer group'
      mid.appendChild(t)
    }
    if (layer.kind === 'text') {
      const t = document.createElement('span')
      t.className = 't-tag'
      t.textContent = 'T'
      t.title = 'Type layer — double-click to edit'
      mid.appendChild(t)
    }
    if (fxActive(layer.fx)) {
      const fx = document.createElement('span')
      fx.className = 'fx-tag'
      fx.textContent = 'fx'
      mid.appendChild(fx)
    }
    if (layer.clip) {
      const clip = document.createElement('span')
      clip.className = 'clip-tag'
      clip.textContent = 'clip'
      mid.appendChild(clip)
    }
    li.appendChild(mid)
    const flags = document.createElement('span')
    flags.className = 'lock'
    flags.title = layer.lockPos ? 'Background (fixed)' : (layer.locked ? 'Locked' : '')
    flags.textContent = layer.lockPos ? 'B' : (layer.locked ? 'L' : (layer.lockTrans ? 'T' : ''))
    flags.addEventListener('click', (e) => {
      e.stopPropagation()
      if (layer.lockPos) layer.lockPos = false
      else layer.locked = !layer.locked
      renderLayers(app)
      syncLayerControls(app)
    })
    li.appendChild(flags)
    if (layer.kind === 'group') {
      li.querySelector('.fold')?.addEventListener('click', (e) => {
        e.stopPropagation()
        layer.collapsed = !layer.collapsed
        renderLayers(app)
      })
    }
    li.querySelector('.eye').addEventListener('click', (e) => {
      e.stopPropagation()
      app.doc.active = i
      if (e.altKey) {
        const only = app.doc.layers.filter(l => l.visible).length === 1 && layer.visible
        if (only) app.doc.showAll()
        else app.doc.hideOthers()
      } else {
        layer.visible = !layer.visible
        if (layer.kind === 'group') {
          app.doc.layers.forEach(l => { if (l.parentId === layer.id) l.visible = layer.visible })
        }
      }
      app.render()
    })
    li.addEventListener('click', (e) => {
      app.doc.selectLayer(i, e.shiftKey || e.ctrlKey || e.metaKey)
      syncLayerControls(app)
      renderLayers(app)
    })
    li.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'INPUT') return
      if (layer.kind === 'text') {
        e.preventDefault()
        app.beginText({ x: layer.x, y: layer.y }, layer)
        return
      }
      name.focus()
      name.select()
    })
    li.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showLayerMenu(app, i, e.clientX, e.clientY)
    })
    li.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(i))
      li.classList.add('dragging')
    })
    li.addEventListener('dragend', () => { li.classList.remove('dragging'); li.classList.remove('drop-into') })
    li.addEventListener('dragover', e => {
      e.preventDefault()
      if (layer.kind === 'group') li.classList.add('drop-into')
    })
    li.addEventListener('dragleave', () => li.classList.remove('drop-into'))
    li.addEventListener('drop', e => {
      e.preventDefault()
      li.classList.remove('drop-into')
      const from = +e.dataTransfer.getData('text/plain')
      if (Number.isNaN(from) || from === i) return
      app.doc.reparentLayer(from, i)
      app.render()
      syncLayerControls(app)
    })
    list.appendChild(li)
  })
}

export function syncLayerControls(app) {
  const layer = app.doc.currentLayer()
  const sel = document.getElementById('blend-mode')
  if (!sel.options.length) {
    BLEND_MODES.forEach(m => {
      const o = document.createElement('option')
      o.value = m
      o.textContent = BLEND_LABELS[m]
      sel.appendChild(o)
    })
  }
  if (layer) {
    sel.value = layer.blend
    document.getElementById('layer-opacity').value = Math.round(layer.opacity * 100)
    document.getElementById('layer-opacity-val').textContent = Math.round(layer.opacity * 100) + '%'
    const fill = document.getElementById('layer-fill')
    const fillVal = document.getElementById('layer-fill-val')
    if (fill) {
      fill.value = Math.round((layer.fill ?? 1) * 100)
      if (fillVal) fillVal.textContent = Math.round((layer.fill ?? 1) * 100) + '%'
    }
    document.getElementById('lock-all')?.classList.toggle('on', !!layer.locked)
    document.getElementById('lock-pos')?.classList.toggle('on', !!layer.lockPos)
    document.getElementById('lock-trans')?.classList.toggle('on', !!layer.lockTrans)
  }
}

export function renderHistory(app) {
  const ul = document.getElementById('history-list')
  ul.innerHTML = ''
  app.doc.history.forEach((h, i) => {
    const li = document.createElement('li')
    li.className = i === app.doc.histIndex ? 'active' : ''
    li.textContent = h.label
    li.addEventListener('click', () => {
      app.doc.goToHistory(i)
      app.layoutCanvas()
    })
    ul.appendChild(li)
  })
}

export function modal({ title, body, onOk, okLabel = 'OK', cls = '', hideFoot = false, wide = false }) {
  const root = document.getElementById('modal-root')
  const wrap = document.createElement('div')
  wrap.className = 'modal-back'
  wrap.innerHTML = `<div class="modal${wide ? ' wide' : ''}${cls ? ' ' + cls : ''}"><h2>${title}<button type="button" class="modal-x" aria-label="Close">×</button></h2><div class="body"></div>${hideFoot ? '' : `<div class="foot"><button type="button" class="cancel">Cancel</button><button type="button" class="ok">${okLabel}</button></div>`}</div>`
  wrap.querySelector('.body').appendChild(body)
  const close = () => wrap.remove()
  wrap.querySelector('.modal-x').onclick = close
  wrap.querySelector('.cancel') && (wrap.querySelector('.cancel').onclick = close)
  const ok = wrap.querySelector('.ok')
  if (ok) ok.onclick = () => { if (onOk() !== false) close() }
  wrap.addEventListener('click', e => { if (e.target === wrap) close() })
  root.appendChild(wrap)
  return wrap
}

export const NEW_PRESETS = {
  Social: [
    { name: 'FB Page Cover', w: 1640, h: 664 },
    { name: 'FB Event Image', w: 1920, h: 1080 },
    { name: 'FB Group Header', w: 1640, h: 856 },
    { name: 'Instagram', w: 1080, h: 1080 },
    { name: 'Insta Story', w: 1080, h: 1920 },
    { name: 'Insta Portrait', w: 1080, h: 1350 },
    { name: 'Youtube Thumbnail', w: 1280, h: 720 },
    { name: 'Youtube Profile', w: 800, h: 800 },
    { name: 'Youtube Cover', w: 2560, h: 1440 },
    { name: 'Twitter Profile', w: 400, h: 400 },
    { name: 'Twitter Header', w: 1500, h: 500 }
  ],
  Print: [
    { name: 'A4', w: 2480, h: 3508 },
    { name: 'A3', w: 3508, h: 4961 },
    { name: 'A5', w: 1748, h: 2480 },
    { name: 'Letter', w: 2550, h: 3300 },
    { name: 'Legal', w: 2550, h: 4200 },
    { name: 'Tabloid', w: 3300, h: 5100 },
    { name: 'Business Card', w: 1050, h: 600 },
    { name: 'Poster', w: 5400, h: 7200 }
  ],
  Photo: [
    { name: '2R', w: 600, h: 900 },
    { name: '3R', w: 1050, h: 1500 },
    { name: '4R', w: 1200, h: 1800 },
    { name: '5R', w: 1500, h: 2100 },
    { name: '6R', w: 1800, h: 2400 },
    { name: '8R', w: 2400, h: 3000 },
    { name: 'Square', w: 2000, h: 2000 },
    { name: 'Panorama', w: 3600, h: 1200 }
  ],
  Screen: [
    { name: 'HD 1280×720', w: 1280, h: 720 },
    { name: 'WXGA 1366×768', w: 1366, h: 768 },
    { name: 'Full HD', w: 1920, h: 1080 },
    { name: 'QHD', w: 2560, h: 1440 },
    { name: '4K UHD', w: 3840, h: 2160 },
    { name: 'SXGA', w: 1280, h: 1024 },
    { name: 'UXGA', w: 1600, h: 1200 },
    { name: 'Web 1280×800', w: 1280, h: 800 }
  ],
  Mobile: [
    { name: 'iPhone 15', w: 1179, h: 2556 },
    { name: 'iPhone SE', w: 750, h: 1334 },
    { name: 'Android HD', w: 1080, h: 1920 },
    { name: 'Android QHD', w: 1440, h: 2560 },
    { name: 'iPad', w: 1620, h: 2160 },
    { name: 'iPad Pro 11', w: 1668, h: 2388 },
    { name: 'App Icon', w: 1024, h: 1024 },
    { name: 'Splash', w: 1242, h: 2688 }
  ],
  Ads: [
    { name: 'Medium Rectangle', w: 300, h: 250 },
    { name: 'Leaderboard', w: 728, h: 90 },
    { name: 'Wide Skyscraper', w: 160, h: 600 },
    { name: 'Large Rectangle', w: 336, h: 280 },
    { name: 'Billboard', w: 970, h: 250 },
    { name: 'Half Page', w: 300, h: 600 },
    { name: 'Square Ad', w: 250, h: 250 },
    { name: 'Banner', w: 468, h: 60 }
  ]
}

export function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove())
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1800)
}

export const ADJUST_DEFS = [
  { id: 'brightness', label: 'Brightness', min: -100, max: 100, val: 0 },
  { id: 'contrast', label: 'Contrast', min: -100, max: 100, val: 0 },
  { id: 'saturation', label: 'Saturation', min: -100, max: 100, val: 0 },
  { id: 'hue', label: 'Hue', min: -180, max: 180, val: 0 },
  { id: 'exposure', label: 'Exposure', min: -100, max: 100, val: 0 },
  { id: 'gamma', label: 'Gamma', min: 10, max: 300, val: 100 },
  { id: 'temperature', label: 'Temp', min: -100, max: 100, val: 0 },
  { id: 'vibrance', label: 'Vibrance', min: -100, max: 100, val: 0 },
  { id: 'highlights', label: 'Highlights', min: -100, max: 100, val: 0 },
  { id: 'shadows', label: 'Shadows', min: -100, max: 100, val: 0 }
]
