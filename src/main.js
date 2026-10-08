import { Document, documentFromImage, loadImage, createCanvas } from './engine.js'
import { createToolController, toolById } from './tools.js'
import { FILTERS, applyAdjustments } from './filters.js'
import {
  buildMenus, buildToolbar, renderOptions, renderLayers, renderHistory,
  syncLayerControls, syncToolbar, modal, toast, ADJUST_DEFS, hsvToRgb, rgbToHex, hexToHsv, NEW_PRESETS
} from './ui.js'

const view = document.getElementById('view')
const overlay = document.getElementById('overlay')
const wrap = document.getElementById('canvas-wrap')
const fileOpen = document.getElementById('file-open')
const filePlace = document.getElementById('file-place')

const app = {
  doc: new Document(1280, 800, '#ffffff'),
  tool: 'brush',
  tools: null,
  cursor: { x: 0, y: 0 },
  adj: Object.fromEntries(ADJUST_DEFS.map(a => [a.id, 0])),
  adjBase: null,
  marching: 0,
  colorTarget: 'fg',
  hsv: { h: 0, s: 1, v: 1 },
  view: {
    extras: true,
    rulers: false,
    snap: true,
    snapGuides: true,
    snapGrid: false,
    snapLayers: true,
    snapBounds: true,
    layerEdges: false,
    selEdges: true,
    guides: true,
    grid: false,
    slices: false,
    lockGuides: false
  },
  panels: {
    color: false,
    adjust: false,
    layers: true,
    history: true,
    swatches: true,
    navigator: false,
    info: false,
    brush: false,
    character: false,
    paragraph: false,
    paths: false,
    channels: false,
    actions: false,
    properties: false
  },
  guides: [],
  screenMode: 'standard',

  toast,
  setTool(id) {
    this.tool = id
    syncToolbar(this)
    renderOptions(this)
    const meta = toolById(id)
    document.getElementById('status-tool').textContent = meta?.label || id
    wrap.style.cursor = id === 'move' || id === 'path'
      ? 'default'
      : id === 'hand' ? 'grab'
      : id === 'text' ? 'text'
      : id === 'zoom' ? 'zoom-in'
      : 'crosshair'
  },
  setFg(hex, keepHsv = false) {
    this.doc.fg = hex
    const sw = document.getElementById('fg-swatch')
    if (sw) sw.style.background = hex
    if (this.colorTarget !== 'bg') {
      const inp = document.getElementById('hex-input')
      if (inp && document.activeElement !== inp) inp.value = hex.replace('#', '')
      if (!keepHsv) this.hsv = hexToHsv(hex)
      drawPicker(this)
    }
    syncToolbar(this)
    syncSwatches(this)
  },
  setBg(hex, keepHsv = false) {
    this.doc.bg = hex
    const sw = document.getElementById('bg-swatch')
    if (sw) sw.style.background = hex
    if (this.colorTarget === 'bg') {
      const inp = document.getElementById('hex-input')
      if (inp && document.activeElement !== inp) inp.value = hex.replace('#', '')
      if (!keepHsv) this.hsv = hexToHsv(hex)
      drawPicker(this)
    }
    syncToolbar(this)
    syncSwatches(this)
  },
  screenToDoc(cx, cy) {
    const r = view.getBoundingClientRect()
    return {
      x: (cx - r.left) * (this.doc.width / r.width),
      y: (cy - r.top) * (this.doc.height / r.height)
    }
  },
  layoutCanvas() {
    const d = this.doc
    const maxW = wrap.clientWidth - 48
    const maxH = wrap.clientHeight - 48
    const fit = Math.min(maxW / d.width, maxH / d.height, 4)
    if (!d._fitted) {
      d.zoom = Math.min(1, fit)
      d._fitted = true
    }
    const w = d.width * d.zoom
    const h = d.height * d.zoom
    const left = (wrap.clientWidth - w) / 2 + d.panX
    const top = (wrap.clientHeight - h) / 2 + d.panY
    for (const c of [view, overlay]) {
      c.width = d.width
      c.height = d.height
      c.style.width = w + 'px'
      c.style.height = h + 'px'
      c.style.left = left + 'px'
      c.style.top = top + 'px'
    }
    document.getElementById('status-zoom').textContent = Math.round(d.zoom * 100) + '%'
    document.getElementById('status-size').textContent = `${d.width} × ${d.height}`
    this.render()
    this.applyView()
    this.drawNavigator()
  },
  setZoom(z, around) {
    this.doc.zoom = Math.max(0.05, Math.min(8, z))
    this.doc._fitted = true
    this.layoutCanvas()
  },
  fitZoom() {
    this.doc._fitted = false
    this.doc.panX = 0
    this.doc.panY = 0
    this.layoutCanvas()
  },
  paint() {
    const ctx = view.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = this.doc.zoom < 1
    this.doc.compositeTo(ctx)
  },
  render() {
    this.paint()
    renderLayers(this)
    renderHistory(this)
    syncLayerControls(this)
  },
  renderOverlay() {
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    if (this.view.extras && this.view.layerEdges) {
      const layer = this.doc.currentLayer()
      if (layer) {
        ctx.save()
        ctx.strokeStyle = 'rgba(13,153,255,.85)'
        ctx.setLineDash([4, 3])
        ctx.strokeRect(layer.x + 0.5, layer.y + 0.5, layer.canvas.width, layer.canvas.height)
        ctx.restore()
      }
    }
    const sel = this.doc.selection
    if (sel && this.view.extras && this.view.selEdges) {
      ctx.save()
      const drawSel = (color, offset) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.lineDashOffset = offset
        ctx.beginPath()
        if (sel.ellipse) {
          ctx.ellipse(sel.x + sel.w / 2, sel.y + sel.h / 2, sel.w / 2, sel.h / 2, 0, 0, Math.PI * 2)
        } else {
          ctx.rect(sel.x + 0.5, sel.y + 0.5, sel.w, sel.h)
        }
        ctx.stroke()
      }
      drawSel('#fff', this.marching)
      drawSel('#000', this.marching + 5)
      ctx.restore()
    }
    this.tools.overlay(ctx)
    if (this._textEdit) {
      const ed = this._textEdit
      ctx.save()
      ctx.font = ed.font
      ctx.fillStyle = ed.color
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      const metrics = ctx.measureText(ed.text || '')
      const ascent = metrics.actualBoundingBoxAscent || 40
      ctx.fillText(ed.text, ed.x, ed.y)
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        const cx = ed.x + (metrics.width || 0)
        ctx.strokeStyle = ed.color
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(cx + 1, ed.y - ascent)
        ctx.lineTo(cx + 1, ed.y + (metrics.actualBoundingBoxDescent || 6))
        ctx.stroke()
      }
      ctx.restore()
    }
    const t = this.tool
    if (['brush', 'pencil', 'eraser', 'clone', 'blur', 'sharpen', 'smudge', 'dodge', 'burn', 'heal', 'history-brush'].includes(t) && this.cursor) {
      ctx.beginPath()
      ctx.arc(this.cursor.x, this.cursor.y, this.tools.state.brushSize / 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,.85)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  },
  applyFilter(id) {
    const layer = this.doc.currentLayer()
    if (!layer) return
    const fn = FILTERS[id]
    if (!fn) return
    fn(layer.canvas)
    this.doc.pushHistory(id)
    this.render()
  },
  applyLiveAdjust() {
    const layer = this.doc.currentLayer()
    if (!layer || !this.adjBase) return
    const ctx = layer.canvas.getContext('2d')
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.drawImage(this.adjBase, 0, 0)
    applyAdjustments(layer.canvas, this.adj)
    this.render()
  },
  commitAdjust() {
    if (!this.adjBase) return
    this.doc.pushHistory('Adjustments')
    this.adjBase = null
    ADJUST_DEFS.forEach(a => { this.adj[a.id] = 0 })
    document.querySelectorAll('#adjust-list input').forEach(i => { i.value = 0 })
    document.querySelectorAll('#adjust-list .val').forEach(s => { s.textContent = '0' })
  },
  selectAll() {
    this.doc.selection = { x: 0, y: 0, w: this.doc.width, h: this.doc.height }
    this.renderOverlay()
  },
  invertSelection() {
    if (!this.doc.selection) { this.selectAll(); return }
    this.doc.selection = { ...this.doc.selection, inverted: !this.doc.selection.inverted }
    this.renderOverlay()
  },
  commitCrop() {
    const r = this.tools.state.cropRect
    if (!r) return
    this.doc.cropTo(r.x, r.y, r.w, r.h)
    this.tools.state.cropRect = null
    this.layoutCanvas()
  },
  cancelCrop() {
    this.tools.state.cropRect = null
    this.renderOverlay()
  },
  cropSelection() {
    const s = this.doc.selection
    if (!s) { toast('Make a selection first'); return }
    this.doc.cropTo(s.x, s.y, s.w, s.h)
    this.layoutCanvas()
  },
  rotate(deg) {
    const rad = deg * Math.PI / 180
    const swap = Math.abs(deg) === 90
    const nw = swap ? this.doc.height : this.doc.width
    const nh = swap ? this.doc.width : this.doc.height
    for (const layer of this.doc.layers) {
      const next = createCanvas(nw, nh)
      const ctx = next.getContext('2d')
      ctx.translate(nw / 2, nh / 2)
      ctx.rotate(rad)
      ctx.drawImage(layer.canvas, -layer.canvas.width / 2, -layer.canvas.height / 2)
      layer.canvas = next
    }
    this.doc.width = nw
    this.doc.height = nh
    this.doc.pushHistory('Rotate')
    this.layoutCanvas()
  },
  flip(h) {
    for (const layer of this.doc.layers) {
      const next = createCanvas(layer.canvas.width, layer.canvas.height)
      const ctx = next.getContext('2d')
      ctx.translate(h ? next.width : 0, h ? 0 : next.height)
      ctx.scale(h ? -1 : 1, h ? 1 : -1)
      ctx.drawImage(layer.canvas, 0, 0)
      layer.canvas = next
    }
    this.doc.pushHistory(h ? 'Flip Horizontal' : 'Flip Vertical')
    this.render()
  },
  async openFile() { fileOpen.click() },
  async placeFile() { filePlace.click() },
  async loadFromFile(file, place) {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)
    if (place) {
      const layer = this.doc.addLayer(file.name.replace(/\.[^.]+$/, ''))
      const ctx = layer.canvas.getContext('2d')
      const scale = Math.min(1, this.doc.width / img.width, this.doc.height / img.height)
      const w = img.width * scale, h = img.height * scale
      ctx.drawImage(img, (this.doc.width - w) / 2, (this.doc.height - h) / 2, w, h)
      this.doc.pushHistory('Place')
    } else {
      this.doc = await documentFromImage(img, file.name.replace(/\.[^.]+$/, ''))
      this.bindDoc()
    }
    document.getElementById('doc-title').textContent = this.doc.name
    this.layoutCanvas()
    renderHistory(this)
    syncLayerControls(this)
  },
  bindDoc() {
    this.doc.on(type => {
      if (type === 'history' || type === 'restore' || type === 'change') {
        this.paint()
        renderLayers(this)
        renderHistory(this)
        syncLayerControls(this)
      }
    })
  },
  async exportImage(kind) {
    const mime = kind === 'jpeg' ? 'image/jpeg' : kind === 'webp' ? 'image/webp' : 'image/png'
    const blob = await this.doc.exportBlob(mime, 0.92)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${this.doc.name}.${kind}`
    a.click()
    URL.revokeObjectURL(a.href)
  },
  newDocDialog() {
    const body = document.createElement('div')
    body.className = 'np'
    const cats = Object.keys(NEW_PRESETS)
    body.innerHTML = `
      <div class="np-left">
        <div class="np-tabs">${cats.map((c, i) => `<button type="button" class="np-tab${i ? '' : ' on'}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="np-grid" id="np-grid"></div>
      </div>
      <div class="np-right">
        <label class="np-lab">Name</label>
        <input id="nd-name" value="New Project">
        <div class="np-wh">
          <div><label class="np-lab">Width</label><input id="nd-w" type="number" min="1" value="1280"></div>
          <button type="button" class="np-swap" id="nd-swap" title="Swap">⇄</button>
          <div><label class="np-lab">Height</label><input id="nd-h" type="number" min="1" value="720"></div>
          <select id="nd-unit"><option>Pixels</option><option>Inches</option><option>mm</option></select>
        </div>
        <label class="np-lab">DPI</label>
        <div class="np-dpi">
          <input id="nd-dpi" type="number" min="1" value="72">
          <select id="nd-dpiu"><option>Pixels / Inch</option><option>Pixels / cm</option></select>
        </div>
        <label class="np-lab">Background</label>
        <div class="np-bg">
          <select id="nd-bg">
            <option value="#ffffff">White</option>
            <option value="#000000">Black</option>
            <option value="transparent">Transparent</option>
            <option value="#808080">Gray</option>
          </select>
          <span class="np-chip" id="nd-chip"></span>
        </div>
        <div class="np-mode">
          <div><label class="np-lab">Mode</label><select id="nd-mode"><option>RGB</option><option>Grayscale</option></select></div>
          <div><label class="np-lab">&nbsp;</label><select id="nd-bit"><option>8 bit</option><option>16 bit</option></select></div>
          <div><label class="np-lab">Profile</label><select id="nd-prof"><option>sRGB</option><option>Adobe RGB</option></select></div>
        </div>
        <button type="button" class="np-create" id="nd-create">Create</button>
      </div>`

    const grid = body.querySelector('#np-grid')
    const wEl = body.querySelector('#nd-w')
    const hEl = body.querySelector('#nd-h')
    const nameEl = body.querySelector('#nd-name')
    const chip = body.querySelector('#nd-chip')
    const bgEl = body.querySelector('#nd-bg')
    const paintChip = () => {
      chip.style.background = bgEl.value === 'transparent'
        ? 'repeating-conic-gradient(#888 0 25%, #ddd 0 50%) 0 0 / 8px 8px'
        : bgEl.value
    }
    paintChip()
    bgEl.onchange = paintChip

    const fillGrid = (cat) => {
      grid.innerHTML = ''
      NEW_PRESETS[cat].forEach(p => {
        const card = document.createElement('button')
        card.type = 'button'
        card.className = 'np-card'
        const ratio = p.w / p.h
        const boxW = ratio >= 1 ? 78 : Math.max(28, 78 * ratio)
        const boxH = ratio >= 1 ? Math.max(22, 52 / ratio) : 70
        card.innerHTML = `<span class="np-box" style="width:${boxW}px;height:${boxH}px"></span><strong>${p.name}</strong><em>${p.w} x ${p.h} px</em>`
        const pick = () => {
          grid.querySelectorAll('.np-card').forEach(c => c.classList.remove('on'))
          card.classList.add('on')
          wEl.value = p.w
          hEl.value = p.h
          nameEl.value = p.name
        }
        card.onclick = pick
        card.ondblclick = () => { pick(); create(); wrap.remove() }
        grid.appendChild(card)
      })
    }
    fillGrid(cats[0])
    body.querySelectorAll('.np-tab').forEach(tab => {
      tab.onclick = () => {
        body.querySelectorAll('.np-tab').forEach(t => t.classList.remove('on'))
        tab.classList.add('on')
        fillGrid(tab.dataset.cat)
      }
    })
    body.querySelector('#nd-swap').onclick = () => {
      const a = wEl.value
      wEl.value = hEl.value
      hEl.value = a
    }

    const create = () => {
      let w = Math.max(1, Math.round(+wEl.value || 1))
      let h = Math.max(1, Math.round(+hEl.value || 1))
      const unit = body.querySelector('#nd-unit').value
      const dpi = Math.max(1, +body.querySelector('#nd-dpi').value || 72)
      if (unit === 'Inches') { w = Math.round(w * dpi); h = Math.round(h * dpi) }
      if (unit === 'mm') { w = Math.round(w / 25.4 * dpi); h = Math.round(h / 25.4 * dpi) }
      w = Math.min(8000, w)
      h = Math.min(8000, h)
      const bg = bgEl.value
      this.doc = new Document(w, h, bg === 'transparent' ? null : bg)
      this.doc.name = nameEl.value || 'New Project'
      if (bg === 'transparent') {
        this.doc.layers[0].locked = false
        this.doc.layers[0].lockPos = false
        this.doc.layers[0].name = 'Layer 1'
      } else {
        this.doc.layers[0].lockPos = true
      }
      document.getElementById('doc-title').textContent = this.doc.name
      this.bindDoc()
      this.layoutCanvas()
      renderHistory(this)
      syncLayerControls(this)
    }

    const wrap = modal({ title: 'New Project', body, hideFoot: true, wide: true, cls: 'np-modal' })
    body.querySelector('#nd-create').onclick = () => { create(); wrap.remove() }
    wrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault()
        create()
        wrap.remove()
      }
    })
  },
  imageSizeDialog() {
    const body = document.createElement('div')
    body.innerHTML = `
      <div class="row"><label>Width</label><input id="is-w" type="number" value="${this.doc.width}"></div>
      <div class="row"><label>Height</label><input id="is-h" type="number" value="${this.doc.height}"></div>`
    modal({
      title: 'Image Size',
      body,
      onOk: () => {
        this.doc.resize(+body.querySelector('#is-w').value, +body.querySelector('#is-h').value)
        this.layoutCanvas()
      }
    })
  },
  helpDialog() {
    const body = document.createElement('div')
    body.innerHTML = `<div style="line-height:1.7;color:#ccc">
      V Move · M Marquee · L Lasso · C Crop · I Eyedropper · W Wand<br>
      B Brush · E Eraser · S Clone · G Gradient/Bucket · J Heal<br>
      T Type · U Shape · P Pen · H Hand · Z Zoom · R Blur · O Dodge<br>
      [ ] Brush size · X Swap colors · D Reset colors · Space Hand<br>
      Shift constrain · Alt from center / sample / duplicate<br>
      Enter crop · Esc cancel · 1–0 opacity · Arrows nudge<br>
      Ctrl+N New · Ctrl+Shift+N New layer · Ctrl+J Layer via Copy<br>
      Ctrl+A Select all · Ctrl+Shift+I Inverse · Ctrl+[ ] Arrange
    </div>`
    modal({ title: 'Keyboard Shortcuts', body, onOk: () => true })
  },
  aboutDialog() {
    const body = document.createElement('div')
    body.innerHTML = `<p>Pixora is a free in-browser photo editor inspired by Photoshop and Photopea.</p>
      <p style="margin-top:8px;color:#aaa">Layers, masks-style selections, brushes, filters, adjustments, and PSD-like workflow — all local in your browser. Files never leave your device.</p>`
    modal({ title: 'About Pixora', body, onOk: () => true })
  },
  toggleView(key) {
    this.view[key] = !this.view[key]
    this.applyView()
    buildMenus(this)
  },
  togglePanel(id) {
    this.panels[id] = !this.panels[id]
    this._panelFocus = this.panels[id] ? id : null
    this.applyPanels()
    buildMenus(this)
  },
  applyPanels() {
    document.querySelectorAll('#panels .extra-panel').forEach(el => {
      el.hidden = this.panels[el.dataset.panel] === false
    })
    const syncStack = (sel, ids, fallback) => {
      const stack = document.querySelector(sel)
      if (!stack) return stack
      const visible = ids.filter(id => this.panels[id] !== false)
      stack.hidden = visible.length === 0
      if (!visible.length) return stack
      let onTab = stack.querySelector('.panel-tabs [data-tab].on')?.dataset.tab
      if (this._panelFocus && visible.includes(this._panelFocus)) onTab = this._panelFocus
      else if (!visible.includes(onTab)) onTab = visible.includes(fallback) ? fallback : visible[0]
      stack.querySelectorAll('.panel-tabs [data-tab]').forEach(b => {
        b.hidden = this.panels[b.dataset.tab] === false
        b.classList.toggle('on', b.dataset.tab === onTab)
      })
      stack.querySelectorAll('[data-tab-body]').forEach(body => {
        const show = body.dataset.tabBody === onTab
        body.hidden = !show
        body.classList.toggle('on', show)
      })
      return stack
    }
    const top = syncStack('[data-stack="top"]', ['history', 'swatches'], 'history')
    const bot = syncStack('[data-stack="layers"]', ['layers', 'channels', 'paths'], 'layers')
    document.querySelectorAll('#dock-rail [data-rail]').forEach(b => {
      b.classList.toggle('on', this.panels[b.dataset.rail] === true)
    })
    const any = !top?.hidden || !bot?.hidden || [...document.querySelectorAll('#panels .extra-panel')].some(el => !el.hidden)
    document.getElementById('panels').hidden = !any
  },
  applyView() {
    const rh = document.getElementById('ruler-h')
    const rv = document.getElementById('ruler-v')
    const showR = !!this.view.rulers
    if (rh) rh.hidden = !showR
    if (rv) rv.hidden = !showR
    wrap.classList.toggle('has-rulers', showR)
    let grid = wrap.querySelector('.grid-overlay')
    if (this.view.grid && this.view.extras) {
      if (!grid) {
        grid = document.createElement('div')
        grid.className = 'grid-overlay'
        wrap.appendChild(grid)
      }
    } else if (grid) {
      grid.remove()
    }
    wrap.querySelectorAll('.guide').forEach(g => g.remove())
    if (this.view.guides && this.view.extras) {
      this.guides.forEach(g => {
        const el = document.createElement('div')
        el.className = 'guide ' + g.axis
        if (g.axis === 'h') el.style.top = (g.pos * this.doc.zoom + (this.view.rulers ? 18 : 0)) + 'px'
        else el.style.left = (g.pos * this.doc.zoom + (this.view.rulers ? 18 : 0)) + 'px'
        wrap.appendChild(el)
      })
    }
    this.drawRulers()
    this.renderOverlay()
  },
  drawRulers() {
    const rh = document.getElementById('ruler-h')
    const rv = document.getElementById('ruler-v')
    if (!rh || !rv || !this.view.rulers) return
    const zoom = this.doc.zoom
    const step = zoom >= 1 ? 50 : zoom >= 0.5 ? 100 : 200
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    const left = parseFloat(view.style.left) || 0
    const top = parseFloat(view.style.top) || 0
    let ticksH = ''
    for (let x = 0; x <= this.doc.width; x += step) {
      const px = left + x * zoom - 18
      if (px < -20 || px > w) continue
      ticksH += `<span style="position:absolute;left:${px}px;top:2px;font-size:9px">${x}</span>`
    }
    let ticksV = ''
    for (let y = 0; y <= this.doc.height; y += step) {
      const py = top + y * zoom - 18
      if (py < -20 || py > h) continue
      ticksV += `<span style="position:absolute;top:${py}px;left:1px;font-size:9px;writing-mode:vertical-rl">${y}</span>`
    }
    rh.innerHTML = ticksH
    rv.innerHTML = ticksV
  },
  clearGuides() {
    this.guides = []
    this.applyView()
  },
  addGuidesDialog() {
    const body = document.createElement('div')
    body.innerHTML = `
      <div class="row"><label>Axis</label>
        <select id="gd-axis"><option value="h">Horizontal</option><option value="v">Vertical</option></select>
      </div>
      <div class="row"><label>Position</label><input id="gd-pos" type="number" value="0"></div>`
    modal({
      title: 'Add Guides',
      body,
      onOk: () => {
        this.guides.push({ axis: body.querySelector('#gd-axis').value, pos: +body.querySelector('#gd-pos').value || 0 })
        this.applyView()
      }
    })
  },
  setScreenMode(mode) {
    this.screenMode = mode
    document.body.classList.toggle('mode-full', mode === 'full')
    document.body.classList.toggle('mode-menus', mode === 'menus')
    const bar = document.querySelector('.menubar')
    if (bar) bar.style.display = mode === 'full' ? 'none' : ''
    this.layoutCanvas()
  },
  drawNavigator() {
    const c = document.getElementById('nav-canvas')
    if (!c || this.panels.navigator === false) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, c.width, c.height)
    const s = Math.min(c.width / this.doc.width, c.height / this.doc.height)
    const w = this.doc.width * s
    const h = this.doc.height * s
    const x = (c.width - w) / 2
    const y = (c.height - h) / 2
    ctx.drawImage(view, x, y, w, h)
    ctx.strokeStyle = '#0d99ff'
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  },
  resetWorkspace() {
    Object.assign(this.view, {
      extras: true, rulers: false, snap: true, snapGuides: true, snapGrid: false,
      snapLayers: true, snapBounds: true, layerEdges: false, selEdges: true,
      guides: true, grid: false, slices: false, lockGuides: false
    })
    Object.assign(this.panels, {
      color: false, adjust: false, layers: true, history: true, swatches: true,
      navigator: false, info: false, brush: false, character: false,
      paragraph: false, paths: false, channels: false, actions: false, properties: false
    })
    this.setScreenMode('standard')
    this.applyPanels()
    this.applyView()
    buildMenus(this)
  },
  textFont() {
    const s = this.tools.state
    return `${s.textBold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`
  },
  beginText(p) {
    this.commitText()
    this._textEdit = {
      x: p.x,
      y: p.y,
      text: '',
      color: this.doc.fg,
      font: this.textFont(),
      align: this.tools.state.textAlign || 'left'
    }
    this.renderOverlay()
  },
  commitText(cancel = false) {
    const ed = this._textEdit
    if (!ed) return
    this._textEdit = null
    const text = cancel ? '' : ed.text
    if (!text) {
      this.renderOverlay()
      return
    }
    const probe = document.createElement('canvas').getContext('2d')
    probe.font = ed.font
    const metrics = probe.measureText(text)
    const ascent = metrics.actualBoundingBoxAscent || ed.font.match(/(\d+)px/)?.[1] * 0.8 || 40
    const descent = metrics.actualBoundingBoxDescent || 8
    const w = Math.max(2, Math.ceil(metrics.width) + 4)
    const h = Math.max(2, Math.ceil(ascent + descent) + 4)
    const layer = this.doc.addLayer('Text')
    layer.canvas = createCanvas(w, h)
    layer.x = Math.round(ed.x)
    layer.y = Math.round(ed.y - ascent)
    const c = layer.canvas.getContext('2d')
    c.font = ed.font
    c.fillStyle = ed.color
    c.textBaseline = 'alphabetic'
    c.textAlign = 'left'
    c.fillText(text, 2, ascent + 2)
    this.doc.pushHistory('Type')
    this.render()
  },
  typeKey(e) {
    const ed = this._textEdit
    if (!ed) return false
    if (e.ctrlKey || e.metaKey) return false
    e.preventDefault()
    if (e.key === 'Enter') this.commitText(false)
    else if (e.key === 'Escape') this.commitText(true)
    else if (e.key === 'Backspace') ed.text = ed.text.slice(0, -1)
    else if (e.key === 'Tab') ed.text += '    '
    else if (e.key.length === 1) ed.text += e.key
    this.renderOverlay()
    return true
  },
  cut() {
    this.copy()
    this.doc.clearSelection()
  },
  async copy() {
    const s = this.doc.selection || { x: 0, y: 0, w: this.doc.width, h: this.doc.height }
    const full = createCanvas(this.doc.width, this.doc.height)
    this.doc.compositeTo(full.getContext('2d'))
    const c = createCanvas(Math.max(1, Math.round(s.w)), Math.max(1, Math.round(s.h)))
    const cctx = c.getContext('2d')
    if (s.ellipse) {
      cctx.beginPath()
      cctx.ellipse(s.w / 2, s.h / 2, Math.max(0.5, s.w / 2), Math.max(0.5, s.h / 2), 0, 0, Math.PI * 2)
      cctx.clip()
    }
    cctx.drawImage(full, -s.x, -s.y)
    this._clip = c
    try {
      const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png'))
      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      }
      toast('Copied to clipboard')
    } catch {
      toast('Copied')
    }
  },
  pasteInternal() {
    if (!this._clip) {
      toast('Clipboard empty — copy an image first')
      return
    }
    const layer = this.doc.addLayer('Pasted Image')
    const ctx = layer.canvas.getContext('2d')
    const img = this._clip
    const scale = Math.min(1, this.doc.width / img.width, this.doc.height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (this.doc.width - w) / 2, (this.doc.height - h) / 2, w, h)
    this.doc.pushHistory('Paste')
    this.render()
    toast('Pasted as new layer')
  },
  async pasteImageOnLayer(file, name = 'Pasted Image') {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)
    const layer = this.doc.addLayer(name)
    const ctx = layer.canvas.getContext('2d')
    const scale = Math.min(1, this.doc.width / img.width, this.doc.height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (this.doc.width - w) / 2, (this.doc.height - h) / 2, w, h)
    this.doc.pushHistory('Paste Image')
    this.render()
    renderLayers(this)
    syncLayerControls(this)
    toast('Pasted as new layer')
  },
  async paste(event) {
    const dt = event?.clipboardData
    if (dt) {
      const items = [...(dt.items || [])]
      const imageItem = items.find(item => item.type.startsWith('image/'))
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (file) {
          await this.pasteImageOnLayer(file)
          return
        }
      }
      const file = [...(dt.files || [])].find(f => f.type.startsWith('image/'))
      if (file) {
        await this.pasteImageOnLayer(file, file.name.replace(/\.[^.]+$/, '') || 'Pasted Image')
        return
      }
    }
    if (navigator.clipboard?.read) {
      try {
        const list = await navigator.clipboard.read()
        for (const item of list) {
          const type = item.types.find(t => t.startsWith('image/'))
          if (!type) continue
          const blob = await item.getType(type)
          await this.pasteImageOnLayer(new File([blob], 'paste.png', { type }))
          return
        }
      } catch {
      }
    }
    this.pasteInternal()
  }
}

app.tools = createToolController(app)
app.bindDoc()

buildMenus(app)
buildToolbar(app)
renderOptions(app)
syncLayerControls(app)
renderHistory(app)
app.applyPanels()
app.applyView()

document.querySelectorAll('.panel-tabs [data-tab]').forEach(btn => {
  btn.onclick = () => {
    const stack = btn.closest('.panel-stack')
    stack.querySelectorAll('.panel-tabs [data-tab]').forEach(b => b.classList.toggle('on', b === btn))
    stack.querySelectorAll('[data-tab-body]').forEach(body => {
      const show = body.dataset.tabBody === btn.dataset.tab
      body.hidden = !show
      body.classList.toggle('on', show)
    })
    app.panels[btn.dataset.tab] = true
  }
})
document.querySelectorAll('#dock-rail [data-rail]').forEach(b => {
  b.onclick = () => app.togglePanel(b.dataset.rail)
})
const SWATCHES = ['#000000','#ffffff','#808080','#c0c0c0','#ff3b30','#ff9500','#ffcc00','#34c759','#007aff','#5856d6','#af52de','#ff2d55','#8e8e93','#1c1c1e','#0d99ff','#5b4dff','#00c7be','#ffd60a','#ff9f0a','#ff453a','#30d158','#64d2ff','#bf5af2','#ac8e68']
const grid = document.getElementById('swatch-grid')
if (grid) {
  SWATCHES.forEach(hex => {
    const b = document.createElement('button')
    b.type = 'button'
    b.style.background = hex
    b.title = hex
    b.onclick = e => { e.shiftKey ? app.setBg(hex) : app.setFg(hex) }
    grid.appendChild(b)
  })
}
document.getElementById('layer-link')?.addEventListener('click', () => app.toast('Link layers'))

document.getElementById('layer-add').onclick = () => {
  app.doc.addLayer()
  app.doc.pushHistory('New Layer')
  app.render()
}
document.getElementById('layer-dup').onclick = () => { app.doc.duplicateLayer(); app.render() }
document.getElementById('layer-del').onclick = () => {
  app.doc.deleteLayer()
  app.render()
}
document.getElementById('layer-mask').onclick = () => { app.doc.addMask(); app.render() }
document.getElementById('layer-adj').onclick = () => { app.doc.addFillLayer(app.doc.fg); app.render() }
document.getElementById('layer-group').onclick = () => {
  const l = app.doc.addLayer('Group')
  l.name = 'Group'
  app.doc.pushHistory('New Group')
  app.render()
}
document.getElementById('layer-fx').onclick = e => {
  const l = app.doc.currentLayer()
  if (!l) return
  document.querySelectorAll('.ctx-menu').forEach(el => el.remove())
  const menu = document.createElement('div')
  menu.className = 'ctx-menu'
  const r = e.currentTarget.getBoundingClientRect()
  menu.style.left = r.left + 'px'
  menu.style.bottom = (window.innerHeight - r.top + 4) + 'px'
  menu.style.top = 'auto'
  ;[['Drop Shadow', 'shadow'], ['Outer Glow', 'glow'], ['Stroke', 'stroke'], ['Color Overlay', 'overlay']].forEach(([label, kind]) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = (l.fx?.[kind] ? '✓ ' : '') + label
    b.onclick = () => { menu.remove(); app.doc.toggleFx(kind); app.render() }
    menu.appendChild(b)
  })
  document.body.appendChild(menu)
  const close = ev => {
    if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('pointerdown', close) }
  }
  setTimeout(() => document.addEventListener('pointerdown', close), 0)
}
document.getElementById('lock-all').onclick = () => {
  const l = app.doc.currentLayer()
  if (!l) return
  l.locked = !l.locked
  syncLayerControls(app)
  renderLayers(app)
}
document.getElementById('lock-pos').onclick = () => {
  const l = app.doc.currentLayer()
  if (!l) return
  l.lockPos = !l.lockPos
  syncLayerControls(app)
  renderLayers(app)
}
document.getElementById('lock-trans').onclick = () => {
  const l = app.doc.currentLayer()
  if (!l) return
  l.lockTrans = !l.lockTrans
  syncLayerControls(app)
  renderLayers(app)
}
document.getElementById('blend-mode').onchange = e => {
  const l = app.doc.currentLayer()
  if (l) { l.blend = e.target.value; app.render() }
}
document.getElementById('layer-opacity').oninput = e => {
  const l = app.doc.currentLayer()
  if (l) {
    const v = Math.max(0, Math.min(100, +e.target.value || 0))
    l.opacity = v / 100
    const span = document.getElementById('layer-opacity-val')
    if (span) span.textContent = v + '%'
    app.paint()
  }
}
document.getElementById('layer-fill').oninput = e => {
  const l = app.doc.currentLayer()
  if (l) {
    const v = Math.max(0, Math.min(100, +e.target.value || 0))
    l.fill = v / 100
    const span = document.getElementById('layer-fill-val')
    if (span) span.textContent = v + '%'
    app.paint()
  }
}
document.getElementById('layer-opacity').onchange = () => app.doc.pushHistory('Layer Opacity')
document.getElementById('layer-fill').onchange = () => app.doc.pushHistory('Layer Fill')

document.getElementById('btn-export').onclick = () => app.exportImage('png')

document.getElementById('nav-zoom')?.addEventListener('input', e => {
  app.setZoom(+e.target.value / 100)
  document.getElementById('nav-zoom-val').textContent = e.target.value + '%'
})
const bindBrushPanel = (id, key, spanSel) => {
  document.getElementById(id)?.addEventListener('input', e => {
    app.tools.state[key] = +e.target.value
    const span = e.target.nextElementSibling
    if (span) span.textContent = e.target.value
    renderOptions(app)
  })
}
bindBrushPanel('brush-panel-size', 'brushSize')
bindBrushPanel('brush-panel-hard', 'hardness')
bindBrushPanel('brush-panel-op', 'opacity')
document.getElementById('char-font')?.addEventListener('change', e => {
  app.tools.state.fontFamily = e.target.value
  renderOptions(app)
})
document.getElementById('char-size')?.addEventListener('input', e => {
  app.tools.state.fontSize = +e.target.value
  renderOptions(app)
})
document.querySelectorAll('[data-para-align]').forEach(b => {
  b.onclick = () => {
    app.tools.state.textAlign = b.dataset.paraAlign
    app.toast('Paragraph: ' + b.dataset.paraAlign)
  }
})
fileOpen.onchange = e => { const f = e.target.files[0]; if (f) app.loadFromFile(f, false); e.target.value = '' }
filePlace.onchange = e => { const f = e.target.files[0]; if (f) app.loadFromFile(f, true); e.target.value = '' }

wrap.addEventListener('pointerdown', e => {
  if (e.button !== 0) return
  if (app._textEdit && app.tool !== 'text') app.commitText()
  if (app.tool === 'text') {
    app.tools.down(e)
    return
  }
  wrap.setPointerCapture(e.pointerId)
  app.tools.down(e)
})
wrap.addEventListener('pointermove', e => {
  app.tools.move(e)
  const p = app.screenToDoc(e.clientX, e.clientY)
  document.getElementById('status-pos').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`
  const ix = document.getElementById('info-x')
  if (ix) {
    ix.textContent = Math.round(p.x)
    document.getElementById('info-y').textContent = Math.round(p.y)
    const sel = app.doc.selection
    document.getElementById('info-w').textContent = sel ? Math.round(sel.w) : app.doc.width
    document.getElementById('info-h').textContent = sel ? Math.round(sel.h) : app.doc.height
    document.getElementById('info-hex').textContent = app.doc.fg
  }
})
wrap.addEventListener('pointerup', e => app.tools.up(e))
wrap.addEventListener('pointercancel', e => app.tools.up(e))
wrap.addEventListener('wheel', e => {
  e.preventDefault()
  const p = app.screenToDoc(e.clientX, e.clientY)
  app.setZoom(app.doc.zoom * (e.deltaY > 0 ? 0.9 : 1.1), p)
}, { passive: false })

window.addEventListener('keydown', e => {
  if (app._textEdit && app.typeKey(e)) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  const k = e.key.toLowerCase()
  if (e.code === 'Space') { e.preventDefault(); app._prevTool = app.tool; app.setTool('hand'); return }
  if (e.ctrlKey || e.metaKey) {
    if (k === 'n' && e.shiftKey) { e.preventDefault(); app.doc.addLayer(); app.doc.pushHistory('New Layer'); app.render() }
    else if (k === 'n') { e.preventDefault(); app.newDocDialog() }
    else if (k === 'o') { e.preventDefault(); app.openFile() }
    else if (k === 's') { e.preventDefault(); app.exportImage('png') }
    else if (k === 'z' && e.shiftKey) { e.preventDefault(); app.doc.redo() }
    else if (k === 'z') { e.preventDefault(); app.doc.undo() }
    else if (k === 'y') { e.preventDefault(); app.doc.redo() }
    else if (k === 'j' && e.shiftKey) { e.preventDefault(); app.doc.layerViaCopy(true) }
    else if (k === 'j') { e.preventDefault(); app.doc.selection ? app.doc.layerViaCopy(false) : app.doc.duplicateLayer() }
    else if (k === 'g' && e.altKey) { e.preventDefault(); app.doc.toggleClip() }
    else if (k === 'e' && e.shiftKey) { e.preventDefault(); app.doc.mergeVisible() }
    else if (k === 'e') { e.preventDefault(); app.doc.mergeDown() }
    else if (k === '[' && e.shiftKey) { e.preventDefault(); app.doc.sendToBack() }
    else if (k === ']' && e.shiftKey) { e.preventDefault(); app.doc.bringToFront() }
    else if (k === '[') { e.preventDefault(); app.doc.moveLayer(-1) }
    else if (k === ']') { e.preventDefault(); app.doc.moveLayer(1) }
    else if (k === 'a') { e.preventDefault(); app.selectAll() }
    else if (k === 'd') { e.preventDefault(); app.doc.selection = null; app.renderOverlay() }
    else if (k === 'i' && e.shiftKey) { e.preventDefault(); app.invertSelection() }
    else if (k === 'c') { e.preventDefault(); app.copy() }
    else if (k === 'x') { e.preventDefault(); app.cut() }
    else if (k === 'v') { return }
    else if (k === 'backspace') { e.preventDefault(); app.doc.fillSelection(app.doc.bg) }
    else if (k === '0') { e.preventDefault(); app.fitZoom() }
    else if (k === '1') { e.preventDefault(); app.setZoom(1) }
    else if (k === '=' || k === '+') { e.preventDefault(); app.setZoom(app.doc.zoom * 1.25) }
    else if (k === '-') { e.preventDefault(); app.setZoom(app.doc.zoom * 0.8) }
    else if (k === 'h') { e.preventDefault(); app.toggleView('extras') }
    else if (k === 'r') { e.preventDefault(); app.toggleView('rulers') }
    else if (k === 't') { e.preventDefault(); app.tools.state.showTransform = true; app.setTool('move'); app.renderOverlay() }
    return
  }
  if (k === 'v') app.setTool('move')
  else if (k === 'm') {
    const order = ['marquee', 'ellipse-marquee', 'row-marquee', 'col-marquee']
    const i = order.indexOf(app.tool)
    app.setTool(order[(i + 1) % order.length])
  }
  else if (k === 'l') {
    const order = ['lasso', 'poly-lasso', 'magnetic-lasso', 'wand']
    const i = order.indexOf(app.tool)
    app.setTool(order[(i + 1) % order.length])
  }
  else if (k === 'c') app.setTool(app.tool === 'crop' ? 'slice' : 'crop')
  else if (k === 'i') app.setTool(app.tool === 'eyedropper' ? 'sampler' : 'eyedropper')
  else if (k === 'w') app.setTool('wand')
  else if (k === 'j') app.setTool('heal')
  else if (k === 'y') app.setTool('history-brush')
  else if (k === 'b') app.setTool(app.tool === 'brush' ? 'pencil' : 'brush')
  else if (k === 'e') app.setTool(app.tool === 'eraser' ? 'magic-eraser' : 'eraser')
  else if (k === 's') app.setTool('clone')
  else if (k === 'g') app.setTool(app.tool === 'gradient' ? 'fill' : 'gradient')
  else if (k === 't') app.setTool('text')
  else if (k === 'u') {
    const order = ['shape', 'ellipse', 'line', 'poly']
    const i = order.indexOf(app.tool)
    app.setTool(order[(i + 1) % order.length])
  }
  else if (k === 'p') app.setTool('pen')
  else if (k === 'a') app.setTool('path')
  else if (k === 'h') app.setTool('hand')
  else if (k === 'z') app.setTool('zoom')
  else if (k === 'r') app.setTool(app.tool === 'blur' ? 'sharpen' : app.tool === 'sharpen' ? 'smudge' : 'blur')
  else if (k === 'o') app.setTool(app.tool === 'dodge' ? 'burn' : 'dodge')
  else if (k === 'x') {
    const a = app.doc.fg; app.setFg(app.doc.bg); app.setBg(a)
  } else if (k === 'd') {
    app.setFg('#000000'); app.setBg('#ffffff')
  } else if (k === '[') {
    app.tools.state.brushSize = Math.max(1, app.tools.state.brushSize - 2)
    renderOptions(app)
  } else if (k === ']') {
    app.tools.state.brushSize = Math.min(200, app.tools.state.brushSize + 2)
    renderOptions(app)
  } else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0
    const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0
    const selTools = ['marquee', 'ellipse-marquee', 'lasso', 'poly-lasso', 'wand']
    if (app.doc.selection && selTools.includes(app.tool)) {
      app.doc.selection.x += dx
      app.doc.selection.y += dy
      app.renderOverlay()
    } else {
      const layer = app.doc.currentLayer()
      if (!layer || layer.locked || layer.lockPos) return
      layer.x += dx
      layer.y += dy
      app.paint()
    }
  } else if (k >= '0' && k <= '9' && !e.altKey) {
    const n = k === '0' ? 100 : parseInt(k, 10) * 10
    if (['brush', 'pencil', 'eraser', 'clone', 'gradient', 'fill'].includes(app.tool)) {
      app.tools.state.opacity = n
      renderOptions(app)
    } else {
      const layer = app.doc.currentLayer()
      if (layer) {
        layer.opacity = n / 100
        app.render()
      }
    }
  } else if (k === 'delete' || k === 'backspace') {
    e.preventDefault()
    if (e.altKey) app.doc.fillSelection(app.doc.fg)
    else if (app.doc.selection) app.doc.clearSelection()
    else app.doc.deleteLayer()
  } else if (k === 'enter') {
    if (app.tools.state.cropRect) { e.preventDefault(); app.commitCrop() }
  } else if (k === 'escape') {
    if (app.tools.state.cropRect) app.cancelCrop()
    else { app.doc.selection = null; app.renderOverlay() }
  }
})
window.addEventListener('keyup', e => {
  if (e.code === 'Space' && app._prevTool) {
    app.setTool(app._prevTool)
    app._prevTool = null
  }
})

window.addEventListener('paste', e => {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  e.preventDefault()
  app.paste(e)
})

document.getElementById('swap-colors').onclick = () => {
  const a = app.doc.fg; app.setFg(app.doc.bg); app.setBg(a)
}
document.getElementById('reset-colors').onclick = () => { app.setFg('#000000'); app.setBg('#ffffff') }
function syncSwatches(app) {
  document.getElementById('fg-swatch')?.classList.toggle('active-target', app.colorTarget === 'fg')
  document.getElementById('bg-swatch')?.classList.toggle('active-target', app.colorTarget === 'bg')
}
document.getElementById('fg-swatch').onclick = () => {
  app.colorTarget = 'fg'
  app.hsv = hexToHsv(app.doc.fg)
  const inp = document.getElementById('hex-input')
  if (inp) inp.value = app.doc.fg.replace('#', '')
  drawPicker(app)
  syncSwatches(app)
}
document.getElementById('bg-swatch').onclick = () => {
  app.colorTarget = 'bg'
  app.hsv = hexToHsv(app.doc.bg)
  const inp = document.getElementById('hex-input')
  if (inp) inp.value = app.doc.bg.replace('#', '')
  drawPicker(app)
  syncSwatches(app)
}

const sv = document.getElementById('sv-canvas')
const hue = document.getElementById('hue-canvas')

function drawPicker(app) {
  if (!sv || !hue) return
  const { h, s, v } = app.hsv
  const sctx = sv.getContext('2d')
  const [rr, gg, bb] = hsvToRgb(h, 1, 1)
  const w = sv.width, ht = sv.height
  sctx.fillStyle = `rgb(${rr},${gg},${bb})`
  sctx.fillRect(0, 0, w, ht)
  const gx = sctx.createLinearGradient(0, 0, w, 0)
  gx.addColorStop(0, '#fff')
  gx.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = gx
  sctx.fillRect(0, 0, w, ht)
  const gy = sctx.createLinearGradient(0, 0, 0, ht)
  gy.addColorStop(0, 'rgba(0,0,0,0)')
  gy.addColorStop(1, '#000')
  sctx.fillStyle = gy
  sctx.fillRect(0, 0, w, ht)
  sctx.beginPath()
  sctx.arc(s * w, (1 - v) * ht, 5, 0, Math.PI * 2)
  sctx.strokeStyle = '#fff'
  sctx.lineWidth = 2
  sctx.stroke()

  const hctx = hue.getContext('2d')
  const hg = hctx.createLinearGradient(0, 0, hue.width, 0)
  ;['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'].forEach((c, i) => hg.addColorStop(i / 6, c))
  hctx.fillStyle = hg
  hctx.fillRect(0, 0, hue.width, hue.height)
  hctx.fillStyle = '#fff'
  hctx.fillRect((h / 360) * hue.width - 1, 0, 2, hue.height)
}

function applyHsv() {
  const [rr, gg, bb] = hsvToRgb(app.hsv.h, app.hsv.s, app.hsv.v)
  const hex = rgbToHex(rr, gg, bb)
  if (app.colorTarget === 'bg') app.setBg(hex, true)
  else app.setFg(hex, true)
}
function pickSV(e) {
  const r = sv.getBoundingClientRect()
  if (!r.width || !r.height) return
  app.hsv.s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  app.hsv.v = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  applyHsv()
}
function pickHue(e) {
  const r = hue.getBoundingClientRect()
  if (!r.width) return
  app.hsv.h = Math.min(359, Math.max(0, ((e.clientX - r.left) / r.width) * 360))
  if (app.hsv.v < 0.08) app.hsv.v = 1
  if (app.hsv.s < 0.08) app.hsv.s = 1
  applyHsv()
}
sv.addEventListener('pointerdown', e => { sv.setPointerCapture(e.pointerId); pickSV(e) })
sv.addEventListener('pointermove', e => { if (e.buttons) pickSV(e) })
hue.addEventListener('pointerdown', e => { hue.setPointerCapture(e.pointerId); pickHue(e) })
hue.addEventListener('pointermove', e => { if (e.buttons) pickHue(e) })
  document.getElementById('hex-input').addEventListener('input', e => {
    let v = e.target.value.replace('#', '')
    if (/^[0-9a-fA-F]{6}$/.test(v)) {
      if (app.colorTarget === 'bg') app.setBg('#' + v)
      else app.setFg('#' + v)
    }
  })

app.setFg('#ff3b30')
app.setBg('#ffffff')

const adjRoot = document.getElementById('adjust-list')
ADJUST_DEFS.forEach(a => {
  const row = document.createElement('div')
  row.className = 'adj'
  row.innerHTML = `<span>${a.label}</span><input type="range" min="${a.min}" max="${a.max}" value="0" data-id="${a.id}"><span class="val">0</span>`
  adjRoot.appendChild(row)
})
adjRoot.addEventListener('pointerdown', () => {
  const layer = app.doc.currentLayer()
  if (!layer || app.adjBase) return
  app.adjBase = document.createElement('canvas')
  app.adjBase.width = layer.canvas.width
  app.adjBase.height = layer.canvas.height
  app.adjBase.getContext('2d').drawImage(layer.canvas, 0, 0)
})
adjRoot.addEventListener('input', e => {
  const id = e.target.dataset.id
  if (!id) return
  app.adj[id] = +e.target.value
  e.target.parentElement.querySelector('.val').textContent = e.target.value
  if (!app.adjBase) {
    const layer = app.doc.currentLayer()
    if (!layer) return
    app.adjBase = document.createElement('canvas')
    app.adjBase.width = layer.canvas.width
    app.adjBase.height = layer.canvas.height
    app.adjBase.getContext('2d').drawImage(layer.canvas, 0, 0)
  }
  app.applyLiveAdjust()
})
adjRoot.addEventListener('pointerup', () => app.commitAdjust())

function tick() {
  app.marching = (app.marching + 0.4) % 10
  if (app.doc.selection || app._textEdit || ((app.tool === 'move' || app.tool === 'path') && app.tools.state.showTransform)) app.renderOverlay()
  requestAnimationFrame(tick)
}
tick()

window.addEventListener('resize', () => app.layoutCanvas())
window.addEventListener('dragover', e => { e.preventDefault() })
window.addEventListener('drop', e => {
  e.preventDefault()
  const f = e.dataTransfer.files[0]
  if (f && f.type.startsWith('image/')) app.loadFromFile(f, false)
})

seedDemo(app)
app.layoutCanvas()
app.setTool('move')

function seedDemo(app) {
  const ctx = app.doc.layers[0].canvas.getContext('2d')
  const w = app.doc.width, h = app.doc.height
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#1b2430')
  g.addColorStop(0.5, '#243b55')
  g.addColorStop(1, '#141e30')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const art = app.doc.addLayer('Artwork')
  const c = art.canvas.getContext('2d')
  c.fillStyle = '#0d99ff'
  c.beginPath()
  c.roundRect(w * 0.18, h * 0.22, w * 0.28, h * 0.42, 28)
  c.fill()
  c.fillStyle = '#5b4dff'
  c.beginPath()
  c.arc(w * 0.62, h * 0.42, Math.min(w, h) * 0.16, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#fff'
  c.font = '700 64px Segoe UI, Arial'
  c.fillText('Pixora', w * 0.18, h * 0.78)
  c.font = '28px Segoe UI, Arial'
  c.fillStyle = 'rgba(255,255,255,.7)'
  c.fillText('Online photo editor  ·  Open an image to start', w * 0.18, h * 0.78 + 42)
  app.doc.active = 1
  app.doc.history = []
  app.doc.histIndex = -1
  app.doc.pushHistory('Open')
}
