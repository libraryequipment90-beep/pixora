import { Document, documentFromImage, documentFromProject, loadImage, createCanvas, cloneCanvas, BLEND_MODES, BLEND_LABELS, defaultFx, ensureFx } from './engine.js'
import { createToolController, toolById } from './tools.js'
import { FILTERS, applyAdjustments } from './filters.js'
import {
  levels, curves, hueSaturation, colorBalance, exposure as exposureAdjust, vibrance as vibranceAdjust,
  blackWhite, photoFilter, gradientMap, desaturate, equalize, autoTone, autoColor,
  gaussianBlur, motionBlurAngle, radialBlur, median, reduceNoise, highPass,
  minimum as minimumFilter, maximum as maximumFilter, offsetFilter, clouds, sharpenAmount
} from './filters.js'
import {
  buildMenus, buildToolbar, renderOptions, renderLayers, renderHistory,
  syncLayerControls, syncToolbar, modal, toast, ADJUST_DEFS, hsvToRgb, rgbToHex, hexToHsv, NEW_PRESETS
} from './ui.js'

const view = document.getElementById('view')
const overlay = document.getElementById('overlay')
const wrap = document.getElementById('canvas-wrap')
const fileOpen = document.getElementById('file-open')
const filePlace = document.getElementById('file-place')

const EFFECT_SPECS = {
  levels: {
    title: 'Levels',
    controls: [
      { id: 'inBlack', label: 'Input Black', min: 0, max: 254, def: 0 },
      { id: 'inWhite', label: 'Input White', min: 1, max: 255, def: 255 },
      { id: 'gamma', label: 'Gamma', min: 10, max: 300, def: 100 },
      { id: 'outBlack', label: 'Output Black', min: 0, max: 255, def: 0 },
      { id: 'outWhite', label: 'Output White', min: 0, max: 255, def: 255 }
    ],
    apply(c, v) {
      levels(c, { inBlack: v.inBlack, inWhite: v.inWhite, gamma: v.gamma / 100, outBlack: v.outBlack, outWhite: v.outWhite })
    }
  },
  curves: {
    title: 'Curves',
    controls: [
      { id: 'shadows', label: 'Shadows', min: -100, max: 100, def: 0 },
      { id: 'midtones', label: 'Midtones', min: -100, max: 100, def: 0 },
      { id: 'highlights', label: 'Highlights', min: -100, max: 100, def: 0 }
    ],
    apply(c, v) { curves(c, v) }
  },
  hueSaturation: {
    title: 'Hue/Saturation',
    controls: [
      { id: 'hue', label: 'Hue', min: -180, max: 180, def: 0 },
      { id: 'saturation', label: 'Saturation', min: -100, max: 100, def: 0 },
      { id: 'lightness', label: 'Lightness', min: -100, max: 100, def: 0 }
    ],
    apply(c, v) { hueSaturation(c, v) }
  },
  colorBalance: {
    title: 'Color Balance',
    controls: [
      { id: 'cyanRed', label: 'Cyan / Red', min: -100, max: 100, def: 0 },
      { id: 'magentaGreen', label: 'Magenta / Green', min: -100, max: 100, def: 0 },
      { id: 'yellowBlue', label: 'Yellow / Blue', min: -100, max: 100, def: 0 },
      { id: 'preserveLuminosity', label: 'Preserve Luminosity', type: 'check', def: true }
    ],
    apply(c, v) { colorBalance(c, v) }
  },
  exposure: {
    title: 'Exposure',
    controls: [
      { id: 'exposure', label: 'Exposure', min: -100, max: 100, def: 0 },
      { id: 'offset', label: 'Offset', min: -50, max: 50, def: 0 },
      { id: 'gamma', label: 'Gamma', min: 10, max: 300, def: 100 }
    ],
    apply(c, v) { exposureAdjust(c, { exposure: v.exposure, offset: v.offset, gamma: v.gamma / 100 }) }
  },
  vibrance: {
    title: 'Vibrance',
    controls: [{ id: 'vibrance', label: 'Vibrance', min: -100, max: 100, def: 0 }],
    apply(c, v) { vibranceAdjust(c, v) }
  },
  blackWhite: {
    title: 'Black & White',
    controls: [
      { id: 'reds', label: 'Reds', min: -100, max: 100, def: 0 },
      { id: 'yellows', label: 'Yellows', min: -100, max: 100, def: 0 },
      { id: 'greens', label: 'Greens', min: -100, max: 100, def: 0 },
      { id: 'cyans', label: 'Cyans', min: -100, max: 100, def: 0 },
      { id: 'blues', label: 'Blues', min: -100, max: 100, def: 0 },
      { id: 'magentas', label: 'Magentas', min: -100, max: 100, def: 0 }
    ],
    apply(c, v) { blackWhite(c, v) }
  },
  photoFilter: {
    title: 'Photo Filter',
    controls: [
      { id: 'color', label: 'Color', type: 'color', def: '#ec8a00' },
      { id: 'density', label: 'Density', min: 0, max: 100, def: 25 },
      { id: 'preserveLuminosity', label: 'Preserve Luminosity', type: 'check', def: true }
    ],
    apply(c, v) { photoFilter(c, v) }
  },
  gradientMap: {
    title: 'Gradient Map',
    controls: [
      { id: 'from', label: 'Shadow Color', type: 'color', def: '#000000' },
      { id: 'to', label: 'Highlight Color', type: 'color', def: '#ffffff' }
    ],
    apply(c, v) { gradientMap(c, v) }
  },
  posterize: {
    title: 'Posterize',
    controls: [{ id: 'levels', label: 'Levels', min: 2, max: 32, def: 4 }],
    apply(c, v) { FILTERS.posterize(c, v.levels) }
  },
  threshold: {
    title: 'Threshold',
    controls: [{ id: 'level', label: 'Level', min: 1, max: 254, def: 128 }],
    apply(c, v) { FILTERS.threshold(c, v.level) }
  },
  desaturate: { title: 'Desaturate', controls: [], apply(c) { desaturate(c) } },
  equalize: { title: 'Equalize', controls: [], apply(c) { equalize(c) } },
  autoTone: { title: 'Auto Tone', controls: [], apply(c) { autoTone(c) } },
  autoColor: { title: 'Auto Color', controls: [], apply(c) { autoColor(c) } },
  autoContrast: { title: 'Auto Contrast', controls: [], apply(c) { autoTone(c) } },
  invert: { title: 'Invert', controls: [], apply(c) { FILTERS.invert(c) } },
  gaussianBlur: {
    title: 'Gaussian Blur',
    controls: [{ id: 'radius', label: 'Radius', min: 1, max: 60, def: 4 }],
    apply(c, v) { gaussianBlur(c, v.radius) }
  },
  motionBlur: {
    title: 'Motion Blur',
    controls: [
      { id: 'distance', label: 'Distance', min: 1, max: 100, def: 12 },
      { id: 'angle', label: 'Angle', min: 0, max: 360, def: 0 }
    ],
    apply(c, v) { motionBlurAngle(c, v.distance, v.angle) }
  },
  radialBlur: {
    title: 'Radial Blur (Zoom)',
    controls: [{ id: 'amount', label: 'Amount', min: 1, max: 100, def: 20 }],
    apply(c, v) { radialBlur(c, v.amount, 'zoom') }
  },
  spinBlur: {
    title: 'Radial Blur (Spin)',
    controls: [{ id: 'amount', label: 'Amount', min: 1, max: 100, def: 20 }],
    apply(c, v) { radialBlur(c, v.amount, 'spin') }
  },
  median: {
    title: 'Median',
    controls: [{ id: 'radius', label: 'Radius', min: 1, max: 3, def: 2 }],
    apply(c, v) { median(c, v.radius) }
  },
  reduceNoise: {
    title: 'Reduce Noise',
    controls: [{ id: 'amount', label: 'Amount', min: 1, max: 10, def: 6 }],
    apply(c, v) { reduceNoise(c, v.amount) }
  },
  highPass: {
    title: 'High Pass',
    controls: [{ id: 'radius', label: 'Radius', min: 1, max: 30, def: 6 }],
    apply(c, v) { highPass(c, v.radius) }
  },
  minimum: {
    title: 'Minimum',
    controls: [{ id: 'radius', label: 'Radius', min: 1, max: 6, def: 2 }],
    apply(c, v) { minimumFilter(c, v.radius) }
  },
  maximum: {
    title: 'Maximum',
    controls: [{ id: 'radius', label: 'Radius', min: 1, max: 6, def: 2 }],
    apply(c, v) { maximumFilter(c, v.radius) }
  },
  offset: {
    title: 'Offset',
    controls: [
      { id: 'x', label: 'Horizontal', min: -500, max: 500, def: 0 },
      { id: 'y', label: 'Vertical', min: -500, max: 500, def: 0 }
    ],
    apply(c, v) { offsetFilter(c, v.x, v.y) }
  },
  clouds: {
    title: 'Clouds',
    controls: [{ id: 'scale', label: 'Scale', min: 4, max: 200, def: 40 }],
    apply(c, v) { clouds(c, v.scale) }
  },
  addNoise: {
    title: 'Add Noise',
    controls: [{ id: 'amount', label: 'Amount', min: 1, max: 150, def: 30 }],
    apply(c, v) { FILTERS.noise(c, v.amount) }
  },
  pixelate: {
    title: 'Pixelate',
    controls: [{ id: 'size', label: 'Cell Size', min: 2, max: 64, def: 8 }],
    apply(c, v) { FILTERS.pixelate(c, v.size) }
  },
  sharpenAmount: {
    title: 'Sharpen',
    controls: [{ id: 'amount', label: 'Amount', min: 1, max: 300, def: 100 }],
    apply(c, v) { sharpenAmount(c, v.amount) }
  },
  vignette: {
    title: 'Vignette',
    controls: [{ id: 'strength', label: 'Strength', min: 1, max: 100, def: 55 }],
    apply(c, v) { FILTERS.vignette(c, v.strength / 100) }
  }
}

const app = {
  doc: new Document(1280, 800, '#ffffff'),
  tool: 'brush',
  tools: null,
  cursor: { x: 0, y: 0 },
  adj: Object.fromEntries(ADJUST_DEFS.map(a => [a.id, a.id === 'gamma' ? 100 : 0])),
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
    history: false,
    swatches: false,
    navigator: false,
    info: false,
    brush: false,
    character: false,
    paragraph: false,
    paths: false,
    channels: false,
    actions: false,
    properties: false,
    histogram: false
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
    const next = Math.max(0.05, Math.min(8, z))
    if (around && this.doc.zoom) {
      const sx = around.x / this.doc.width
      const sy = around.y / this.doc.height
      const oldW = this.doc.width * this.doc.zoom
      const oldH = this.doc.height * this.doc.zoom
      const newW = this.doc.width * next
      const newH = this.doc.height * next
      this.doc.panX += (oldW - newW) * (sx - 0.5)
      this.doc.panY += (oldH - newH) * (sy - 0.5)
    }
    this.doc.zoom = next
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
    this.drawHistogram()
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
        if (sel.path && sel.path.length > 2) {
          ctx.moveTo(sel.path[0].x, sel.path[0].y)
          for (let i = 1; i < sel.path.length; i++) ctx.lineTo(sel.path[i].x, sel.path[i].y)
          ctx.closePath()
        } else if (sel.ellipse) {
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
      ctx.textAlign = ed.align || 'left'
      const metrics = ctx.measureText(ed.text || '')
      const ascent = metrics.actualBoundingBoxAscent || 40
      if (!ed.layer) ctx.fillText(ed.text, ed.x, ed.y)
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        const w = metrics.width || 0
        const cx = ed.align === 'center' ? ed.x + w / 2 : ed.align === 'right' ? ed.x : ed.x + w
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
    if (!layer || layer.locked || layer.kind === 'group') return
    this.doc.rasterizeText(layer)
    const fn = FILTERS[id]
    if (!fn) return
    fn(layer.canvas)
    this.doc.pushHistory(id)
    this.render()
  },
  brightnessContrastDialog() {
    const layer = this.doc.currentLayer()
    if (!layer || layer.kind === 'group') { toast('Select a pixel layer'); return }
    if (layer.locked) { toast('Layer is locked'); return }
    this.doc.rasterizeText(layer)
    const base = cloneCanvas(layer.canvas)
    const body = document.createElement('div')
    body.className = 'mini-dlg'
    body.innerHTML = `
      <div class="form-row"><label>Brightness:</label><input id="bc-b" type="range" min="-100" max="100" value="0"><input id="bc-bn" type="number" min="-100" max="100" value="0" style="width:56px"><span></span></div>
      <div class="form-row"><label>Contrast:</label><input id="bc-c" type="range" min="-100" max="100" value="0"><input id="bc-cn" type="number" min="-100" max="100" value="0" style="width:56px"><span></span></div>
      <div class="form-row"><label></label><button type="button" id="bc-reset">Reset</button></div>`
    const b = body.querySelector('#bc-b')
    const bn = body.querySelector('#bc-bn')
    const c = body.querySelector('#bc-c')
    const cn = body.querySelector('#bc-cn')
    const clampVal = v => Math.max(-100, Math.min(100, Math.round(+v || 0)))
    const restore = () => {
      const ctx = layer.canvas.getContext('2d')
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(base, 0, 0)
      this.paint()
    }
    const live = () => {
      const ctx = layer.canvas.getContext('2d')
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(base, 0, 0)
      applyAdjustments(layer.canvas, { brightness: +b.value, contrast: +c.value })
      this.paint()
    }
    b.oninput = () => { bn.value = b.value; live() }
    c.oninput = () => { cn.value = c.value; live() }
    bn.onchange = () => { b.value = clampVal(bn.value); bn.value = b.value; live() }
    cn.onchange = () => { c.value = clampVal(cn.value); cn.value = c.value; live() }
    body.querySelector('#bc-reset').onclick = () => {
      b.value = 0; c.value = 0; bn.value = 0; cn.value = 0
      live()
    }
    const wrapEl = modal({
      title: 'Brightness/Contrast',
      body,
      onOk: () => {
        if (+b.value || +c.value) this.doc.pushHistory('Brightness/Contrast')
        else restore()
        this.render()
      }
    })
    const cancel = () => { restore(); this.render() }
    wrapEl.querySelector('.cancel').addEventListener('click', cancel)
    wrapEl.querySelector('.modal-x').addEventListener('click', cancel)
    wrapEl.addEventListener('click', e => { if (e.target === wrapEl) cancel() })
  },
  autoContrast() {
    const layer = this.doc.currentLayer()
    if (!layer || layer.kind === 'group') { toast('Select a pixel layer'); return }
    if (layer.locked) { toast('Layer is locked'); return }
    this.doc.rasterizeText(layer)
    const ctx = layer.canvas.getContext('2d')
    const img = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
    const d = img.data
    let lo = 255
    let hi = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      if (l < lo) lo = l
      if (l > hi) hi = l
    }
    if (hi <= lo) { toast('Nothing to adjust'); return }
    const scale = 255 / (hi - lo)
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.max(0, Math.min(255, (d[i] - lo) * scale))
      d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] - lo) * scale))
      d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] - lo) * scale))
    }
    ctx.putImageData(img, 0, 0)
    this.doc.pushHistory('Auto Contrast')
    this.render()
  },
  resetAdjustSliders() {
    ADJUST_DEFS.forEach(a => {
      this.adj[a.id] = a.id === 'gamma' ? 100 : 0
    })
    document.querySelectorAll('#adjust-list input[data-id]').forEach(i => {
      i.value = i.dataset.id === 'gamma' ? 100 : 0
    })
    document.querySelectorAll('#adjust-list .val').forEach(s => {
      const id = s.parentElement.querySelector('input')?.dataset.id
      s.textContent = id === 'gamma' ? '100' : '0'
    })
  },
  applyLiveAdjust() {
    const layer = this.doc.currentLayer()
    if (!layer || layer.kind === 'group' || !this.adjBase) return
    const ctx = layer.canvas.getContext('2d')
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.drawImage(this.adjBase, 0, 0)
    applyAdjustments(layer.canvas, this.adj)
    this.paint()
  },
  commitAdjust() {
    if (!this.adjBase) return
    this.doc.pushHistory('Adjustments')
    this.adjBase = null
    this.resetAdjustSliders()
    this.render()
  },
  cancelAdjust() {
    const layer = this.doc.currentLayer()
    if (layer && this.adjBase) {
      const ctx = layer.canvas.getContext('2d')
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(this.adjBase, 0, 0)
    }
    this.adjBase = null
    this.resetAdjustSliders()
    this.render()
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
    this.doc.rotate(deg)
    this.layoutCanvas()
  },
  flip(h) {
    this.doc.flip(h)
    this.render()
  },
  effectDialog(id) {
    const spec = EFFECT_SPECS[id]
    if (!spec) return
    const layer = this.doc.currentLayer()
    if (!layer || layer.kind === 'group') { toast('Select a pixel layer'); return }
    if (layer.locked) { toast('Layer is locked'); return }
    this.doc.rasterizeText(layer)
    if (!spec.controls.length) {
      spec.apply(layer.canvas, {})
      this.doc.pushHistory(spec.title)
      this.render()
      return
    }
    const base = cloneCanvas(layer.canvas)
    const vals = {}
    const body = document.createElement('div')
    body.className = 'mini-dlg'
    const rows = spec.controls.map(c => {
      if (c.type === 'color') {
        vals[c.id] = c.def
        return `<div class="form-row"><label>${c.label}</label><input type="color" data-id="${c.id}" value="${c.def}"></div>`
      }
      if (c.type === 'check') {
        vals[c.id] = !!c.def
        return `<div class="form-row"><label></label><label><input type="checkbox" data-id="${c.id}"${c.def ? ' checked' : ''}> ${c.label}</label></div>`
      }
      vals[c.id] = c.def
      return `<div class="form-row"><label>${c.label}</label><input type="range" data-id="${c.id}" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.def}"><span class="ev">${c.def}</span></div>`
    }).join('')
    body.innerHTML = rows + '<div class="form-row"><label></label><button type="button" class="eff-reset">Reset</button></div>'
    const restore = () => {
      const ctx = layer.canvas.getContext('2d')
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(base, 0, 0)
      this.paint()
    }
    const live = () => {
      const ctx = layer.canvas.getContext('2d')
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(base, 0, 0)
      spec.apply(layer.canvas, vals)
      this.paint()
      this.drawHistogram()
    }
    body.querySelectorAll('[data-id]').forEach(input => {
      const id = input.dataset.id
      const sync = () => {
        if (input.type === 'checkbox') vals[id] = input.checked
        else if (input.type === 'color') vals[id] = input.value
        else {
          vals[id] = +input.value
          const span = input.parentElement.querySelector('.ev')
          if (span) span.textContent = input.value
        }
        live()
      }
      input.addEventListener(input.type === 'range' ? 'input' : 'change', sync)
    })
    body.querySelector('.eff-reset')?.addEventListener('click', () => {
      spec.controls.forEach(c => {
        const input = body.querySelector(`[data-id="${c.id}"]`)
        if (!input) return
        if (input.type === 'checkbox') { input.checked = !!c.def; vals[c.id] = !!c.def }
        else if (input.type === 'color') { input.value = c.def; vals[c.id] = c.def }
        else {
          input.value = c.def
          vals[c.id] = c.def
          const span = input.parentElement.querySelector('.ev')
          if (span) span.textContent = c.def
        }
      })
      live()
    })
    const wrapEl = modal({
      title: spec.title,
      body,
      okLabel: 'OK',
      onOk: () => {
        this.doc.pushHistory(spec.title)
        this.render()
      }
    })
    const cancel = () => { restore(); this.render() }
    wrapEl.querySelector('.cancel').addEventListener('click', cancel)
    wrapEl.querySelector('.modal-x').addEventListener('click', cancel)
    wrapEl.addEventListener('click', e => { if (e.target === wrapEl) cancel() })
    live()
  },
  transformLayer(kind) {
    const layer = this.doc.currentLayer()
    if (!layer || layer.kind === 'group') { toast('Select a pixel layer'); return }
    if (layer.locked || layer.lockPos) { toast('Layer is locked'); return }
    if (kind === 'flipH') this.doc.flipLayer(layer, true)
    else if (kind === 'flipV') this.doc.flipLayer(layer, false)
    else this.doc.rotateLayer(layer, kind)
    this.render()
  },
  modifySelection(kind) {
    const s = this.doc.selection
    if (!s) { toast('Make a selection first'); return }
    const body = document.createElement('div')
    body.innerHTML = `<div class="row"><label>${kind === 'border' ? 'Width' : 'Amount'}</label><input id="ms-a" type="number" min="1" max="200" value="10"> px</div>`
    modal({
      title: `Select ${kind[0].toUpperCase()}${kind.slice(1)}`,
      body,
      onOk: () => {
        const amount = Math.max(1, Math.round(+body.querySelector('#ms-a').value || 1))
        if (kind === 'expand') {
          this.doc.selection = { ...s, x: s.x - amount, y: s.y - amount, w: s.w + amount * 2, h: s.h + amount * 2 }
        } else if (kind === 'contract') {
          const w = Math.max(1, s.w - amount * 2)
          const h = Math.max(1, s.h - amount * 2)
          this.doc.selection = { ...s, x: s.x + amount, y: s.y + amount, w, h }
        } else if (kind === 'border') {
          const outer = { x: s.x - amount, y: s.y - amount, w: s.w + amount * 2, h: s.h + amount * 2 }
          const inner = { x: s.x + amount, y: s.y + amount, w: Math.max(1, s.w - amount * 2), h: Math.max(1, s.h - amount * 2) }
          const path = [
            { x: outer.x, y: outer.y }, { x: outer.x + outer.w, y: outer.y },
            { x: outer.x + outer.w, y: outer.y + outer.h }, { x: outer.x, y: outer.y + outer.h },
            { x: inner.x, y: inner.y }, { x: inner.x, y: inner.y + inner.h },
            { x: inner.x + inner.w, y: inner.y + inner.h }, { x: inner.x + inner.w, y: inner.y }
          ]
          this.doc.selection = { ...outer, path }
        }
        this.render()
        this.renderOverlay()
      }
    })
  },
  growSelection(by = 1) {
    const s = this.doc.selection
    if (!s) { toast('Make a selection first'); return }
    this.doc.selection = { ...s, x: s.x - by, y: s.y - by, w: s.w + by * 2, h: s.h + by * 2 }
    this.renderOverlay()
  },
  trimImage() {
    if (this.doc.trim()) this.layoutCanvas()
    else toast('Nothing to trim')
  },
  revealAll() {
    this.doc.revealAll()
    this.layoutCanvas()
  },
  setMode(mode) {
    this.doc.setMode(mode)
    this.render()
    toast(`Mode: ${mode}`)
  },
  exportSvg() {
    const canvas = createCanvas(this.doc.width, this.doc.height)
    this.doc.compositeTo(canvas.getContext('2d'))
    const data = canvas.toDataURL('image/png')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.doc.width}" height="${this.doc.height}" viewBox="0 0 ${this.doc.width} ${this.doc.height}"><image href="${data}" width="${this.doc.width}" height="${this.doc.height}"/></svg>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    a.download = `${this.doc.name}.svg`
    a.click()
    URL.revokeObjectURL(a.href)
  },
  async openAsLayers() {
    filePlace.multiple = true
    filePlace.dataset.mode = 'layers'
    filePlace.click()
  },
  drawHistogram() {
    const el = document.getElementById('histogram-canvas')
    if (!el || this.panels.histogram === false) return
    const w = el.width, h = el.height
    const ctx = el.getContext('2d')
    ctx.fillStyle = '#1c1c1c'
    ctx.fillRect(0, 0, w, h)
    const probe = createCanvas(this.doc.width, this.doc.height)
    this.doc.compositeTo(probe.getContext('2d'))
    const d = probe.getContext('2d').getImageData(0, 0, probe.width, probe.height).data
    const bins = new Array(64).fill(0)
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      bins[Math.min(63, l / 4 | 0)]++
    }
    const max = Math.max(1, ...bins)
    ctx.fillStyle = '#8ab4f8'
    bins.forEach((v, i) => {
      const bh = Math.round((v / max) * (h - 6))
      ctx.fillRect(i * (w / 64), h - bh, w / 64 - 1, bh)
    })
  },
  async openFile() { fileOpen.click() },
  async placeFile() {
    filePlace.multiple = true
    filePlace.dataset.mode = 'place'
    filePlace.click()
  },
  async loadFromFile(file, place) {
    const name = file.name.replace(/\.[^.]+$/, '')
    if (!place && /\.(pixora|json)$/i.test(file.name)) {
      try {
        const data = JSON.parse(await file.text())
        if (data.format !== 'pixora') throw new Error('Not a Pixora project')
        this.doc = await documentFromProject(data)
        this.bindDoc()
        document.getElementById('doc-title').textContent = this.doc.name
        this.layoutCanvas()
        toast('Project opened')
      } catch {
        toast('Could not open project file')
      }
      return
    }
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
      toast('Unsupported file. Use PNG, JPG, WEBP, or a .pixora project.')
      return
    }
    const url = URL.createObjectURL(file)
    let img
    try {
      img = await loadImage(url)
    } catch {
      URL.revokeObjectURL(url)
      toast('Could not load image')
      return
    }
    URL.revokeObjectURL(url)
    if (place) {
      this.doc.placeImage(img, name)
    } else {
      this.doc = await documentFromImage(img, name)
      this.bindDoc()
    }
    document.getElementById('doc-title').textContent = this.doc.name
    this.layoutCanvas()
    renderHistory(this)
    syncLayerControls(this)
  },
  async saveProject() {
    const data = await this.doc.toProject()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${this.doc.name || 'Untitled'}.pixora`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Project saved')
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
  async exportImage(kind = 'png', quality = 0.92) {
    const mime = kind === 'jpeg' ? 'image/jpeg' : kind === 'webp' ? 'image/webp' : 'image/png'
    const blob = await this.doc.exportBlob(mime, quality)
    if (!blob) { toast('Export failed'); return }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${this.doc.name}.${kind === 'jpeg' ? 'jpg' : kind}`
    a.click()
    URL.revokeObjectURL(a.href)
  },
  exportDialog() {
    const body = document.createElement('div')
    body.innerHTML = `
      <div class="row"><label>Format</label>
        <select id="ex-kind">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WEBP</option>
        </select>
      </div>
      <div class="row" id="ex-qrow" hidden>
        <label>Quality</label>
        <input id="ex-q" type="range" min="10" max="100" value="92">
        <span id="ex-qv">92%</span>
      </div>
      <div class="row"><label>Size</label><span>${this.doc.width} × ${this.doc.height} px</span></div>`
    const kind = body.querySelector('#ex-kind')
    const qrow = body.querySelector('#ex-qrow')
    const q = body.querySelector('#ex-q')
    const qv = body.querySelector('#ex-qv')
    const sync = () => { qrow.hidden = kind.value === 'png' }
    kind.onchange = sync
    q.oninput = () => { qv.textContent = q.value + '%' }
    modal({
      title: 'Export Image',
      body,
      okLabel: 'Export',
      onOk: () => {
        this.exportImage(kind.value, +q.value / 100)
      }
    })
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
    const ow = this.doc.width, oh = this.doc.height
    body.innerHTML = `
      <div class="row"><label>Width</label><input id="is-w" type="number" min="1" value="${ow}"></div>
      <div class="row"><label>Height</label><input id="is-h" type="number" min="1" value="${oh}"></div>
      <div class="row"><label></label><label><input id="is-link" type="checkbox" checked> Constrain proportions</label></div>`
    const w = body.querySelector('#is-w')
    const h = body.querySelector('#is-h')
    const link = body.querySelector('#is-link')
    w.oninput = () => { if (link.checked) h.value = Math.max(1, Math.round(+w.value * oh / ow)) }
    h.oninput = () => { if (link.checked) w.value = Math.max(1, Math.round(+h.value * ow / oh)) }
    modal({
      title: 'Image Size',
      body,
      onOk: () => {
        this.doc.resize(+w.value, +h.value)
        this.layoutCanvas()
      }
    })
  },
  canvasSizeDialog() {
    const body = document.createElement('div')
    body.innerHTML = `
      <div class="row"><label>Width</label><input id="cs-w" type="number" min="1" value="${this.doc.width}"></div>
      <div class="row"><label>Height</label><input id="cs-h" type="number" min="1" value="${this.doc.height}"></div>
      <div class="row"><label>Anchor</label>
        <select id="cs-a">
          <option value="center">Center</option>
          <option value="topleft">Top Left</option>
          <option value="top">Top</option>
          <option value="topright">Top Right</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="bottomleft">Bottom Left</option>
          <option value="bottom">Bottom</option>
          <option value="bottomright">Bottom Right</option>
        </select>
      </div>`
    modal({
      title: 'Canvas Size',
      body,
      onOk: () => {
        this.doc.canvasSize(+body.querySelector('#cs-w').value, +body.querySelector('#cs-h').value, body.querySelector('#cs-a').value)
        this.layoutCanvas()
      }
    })
  },
  helpDialog() {
    const body = document.createElement('div')
    body.innerHTML = `<div style="line-height:1.7;color:#ccc">
      V Move · M Marquee · L Lasso · C Crop · I Eyedropper · W Wand<br>
      B Brush · E Eraser · S Clone · G Gradient/Bucket · J Heal / Red Eye<br>
      T Type · U Shape (U cycles rounded / ellipse / triangle) · P Pen · H Hand · Z Zoom · R Blur · O Dodge<br>
      [ ] Brush size · X Swap colors · D Reset colors · Space Hand<br>
      Shift constrain · Alt from center / sample / duplicate<br>
      Enter crop · Esc cancel · 1–0 opacity · Arrows nudge<br>
      Ctrl+N New · Ctrl+S Save project · Ctrl+Shift+S Export image<br>
      Ctrl+O Open · Ctrl+J Duplicate / Layer via Copy · Ctrl+A Select all<br>
      Ctrl+G Group · Ctrl+Shift+G Ungroup · Ctrl+Shift+I Inverse · Ctrl+[ ] Arrange
    </div>`
    modal({ title: 'Keyboard Shortcuts', body, onOk: () => true })
  },
  aboutDialog() {
    const body = document.createElement('div')
    body.innerHTML = `<p>Pixora is a free in-browser photo editor inspired by Photoshop and Photopea.</p>
      <p style="margin-top:8px;color:#aaa">Layers, selections, brushes, filters, adjustments, and .pixora project files — all local in your browser. Files never leave your device.</p>`
    modal({ title: 'About Pixora', body, onOk: () => true })
  },
  blendSelect(id, value) {
    return `<select id="${id}">${BLEND_MODES.map(m => `<option value="${m}"${m === value ? ' selected' : ''}>${BLEND_LABELS[m]}</option>`).join('')}</select>`
  },
  layerStyleDialog(openTo = 'stroke') {
    const layer = this.doc.currentLayer()
    if (!layer) return
    const orig = JSON.parse(JSON.stringify(ensureFx(layer)))
    const origBlend = layer.blend
    const origOp = layer.opacity
    const origFill = layer.fill
    const fx = { ...defaultFx(), ...orig }
    const effects = [
      ['blending', 'Blending Options', null],
      ['bevel', 'Bevel and Emboss', 'bevel'],
      ['stroke', 'Stroke', 'stroke'],
      ['innerShadow', 'Inner Shadow', 'innerShadow'],
      ['innerGlow', 'Inner Glow', 'innerGlow'],
      ['satin', 'Satin', 'satin'],
      ['overlay', 'Color Overlay', 'overlay'],
      ['gradientOverlay', 'Gradient Overlay', 'gradientOverlay'],
      ['patternOverlay', 'Pattern Overlay', 'patternOverlay'],
      ['glow', 'Outer Glow', 'glow'],
      ['shadow', 'Drop Shadow', 'shadow']
    ]
    if (!effects.some(e => e[0] === openTo)) openTo = 'stroke'
    const body = document.createElement('div')
    body.className = 'ls-body'
    const nav = effects.map(([id, label, key]) => {
      const chk = key ? `<input type="checkbox" data-fx="${key}"${fx[key] ? ' checked' : ''}>` : ''
      return `<button type="button" data-pane="${id}" class="${id === openTo ? 'on' : ''}">${chk}<span>${label}</span></button>`
    }).join('')
    body.innerHTML = `
      <div class="ls-nav">${nav}</div>
      <div class="ls-pane" id="ls-pane"></div>
      <div class="ls-side">
        <button type="button" class="ok" id="ls-ok">OK</button>
        <canvas class="ls-preview" id="ls-preview" width="72" height="72"></canvas>
      </div>`
    const pane = body.querySelector('#ls-pane')
    const preview = body.querySelector('#ls-preview')
    const row = (lab, ctrl) => `<div class="form-row"><label>${lab}</label>${ctrl}</div>`
    const renderPane = (id) => {
      body.querySelectorAll('[data-pane]').forEach(b => b.classList.toggle('on', b.dataset.pane === id))
      if (id === 'stroke') {
        pane.innerHTML = `<h3>Stroke</h3>
          ${row('Size:', `<input id="ls-ss" type="range" min="1" max="50" value="${fx.strokeSize}"><input id="ls-ssn" type="number" min="1" max="50" value="${fx.strokeSize}" style="width:52px"> px`)}
          ${row('Position:', `<select id="ls-sp"><option value="outside"${fx.strokePos === 'outside' ? ' selected' : ''}>Outside</option><option value="inside"${fx.strokePos === 'inside' ? ' selected' : ''}>Inside</option><option value="center"${fx.strokePos === 'center' ? ' selected' : ''}>Center</option></select>`)}
          ${row('Blend Mode:', this.blendSelect('ls-sb', fx.strokeBlend))}
          ${row('Opacity:', `<input id="ls-so" type="range" min="0" max="100" value="${fx.strokeOpacity}"><span id="ls-sov">${fx.strokeOpacity}</span> %`)}
          ${row('Overprint', `<label><input id="ls-ovp" type="checkbox"${fx.strokeOverprint ? ' checked' : ''}> Overprint</label>`)}
          ${row('Fill Type:', `<select id="ls-sft"><option>Color</option></select>`)}
          ${row('Color:', `<input id="ls-sc" type="color" value="${fx.strokeColor || '#000000'}">`)}`
      } else if (id === 'shadow') {
        pane.innerHTML = `<h3>Drop Shadow</h3>
          ${row('Opacity:', `<input id="ls-sho" type="range" min="0" max="100" value="${fx.shadowOpacity}"><span>${fx.shadowOpacity}</span> %`)}
          ${row('Angle:', `<input id="ls-sha" type="number" min="0" max="360" value="${fx.shadowAngle}"> °`)}
          ${row('Distance:', `<input id="ls-shd" type="range" min="0" max="80" value="${fx.shadowDistance}"><span>${fx.shadowDistance}</span> px`)}
          ${row('Size:', `<input id="ls-shs" type="range" min="0" max="80" value="${fx.shadowSize}"><span>${fx.shadowSize}</span> px`)}
          ${row('Color:', `<input id="ls-shc" type="color" value="${fx.shadowColor || '#000000'}">`)}`
      } else if (id === 'glow') {
        pane.innerHTML = `<h3>Outer Glow</h3>
          ${row('Opacity:', `<input id="ls-go" type="range" min="0" max="100" value="${fx.glowOpacity}"><span>${fx.glowOpacity}</span> %`)}
          ${row('Size:', `<input id="ls-gs" type="range" min="0" max="80" value="${fx.glowSize}"><span>${fx.glowSize}</span> px`)}
          ${row('Color:', `<input id="ls-gc" type="color" value="${fx.glowColor || this.doc.fg}">`)}`
      } else if (id === 'overlay') {
        pane.innerHTML = `<h3>Color Overlay</h3>
          ${row('Blend Mode:', this.blendSelect('ls-ob', fx.overlayBlend || 'overlay'))}
          ${row('Opacity:', `<input id="ls-oo" type="range" min="0" max="100" value="${fx.overlayOpacity}"><span>${fx.overlayOpacity}</span> %`)}
          ${row('Color:', `<input id="ls-oc" type="color" value="${fx.overlayColor || this.doc.fg}">`)}`
      } else if (id === 'innerShadow') {
        pane.innerHTML = `<h3>Inner Shadow</h3>
          ${row('Opacity:', `<input id="ls-iso" type="range" min="0" max="100" value="${fx.innerShadowOpacity}"><span>${fx.innerShadowOpacity}</span> %`)}
          ${row('Distance:', `<input id="ls-isd" type="range" min="0" max="80" value="${fx.innerShadowDistance}"><span>${fx.innerShadowDistance}</span> px`)}
          ${row('Size:', `<input id="ls-iss" type="range" min="0" max="80" value="${fx.innerShadowSize}"><span>${fx.innerShadowSize}</span> px`)}
          ${row('Color:', `<input id="ls-isc" type="color" value="${fx.innerShadowColor || '#000000'}">`)}`
      } else if (id === 'innerGlow') {
        pane.innerHTML = `<h3>Inner Glow</h3>
          ${row('Opacity:', `<input id="ls-igo" type="range" min="0" max="100" value="${fx.innerGlowOpacity}"><span>${fx.innerGlowOpacity}</span> %`)}
          ${row('Size:', `<input id="ls-igs" type="range" min="0" max="80" value="${fx.innerGlowSize}"><span>${fx.innerGlowSize}</span> px`)}
          ${row('Color:', `<input id="ls-igc" type="color" value="${fx.innerGlowColor || this.doc.fg}">`)}`
      } else if (id === 'bevel') {
        pane.innerHTML = `<h3>Bevel and Emboss</h3>
          ${row('Size:', `<input id="ls-bs" type="range" min="0" max="40" value="${fx.bevelSize}"><span>${fx.bevelSize}</span> px`)}`
      } else if (id === 'gradientOverlay') {
        pane.innerHTML = `<h3>Gradient Overlay</h3>
          ${row('Color:', `<input id="ls-grc" type="color" value="${fx.gradientColor || this.doc.fg}">`)}`
      } else if (id === 'blending') {
        pane.innerHTML = `<h3>Blending Options</h3>
          ${row('Blend Mode:', this.blendSelect('ls-blend', layer.blend))}
          ${row('Opacity:', `<input id="ls-lop" type="range" min="0" max="100" value="${Math.round((layer.opacity ?? 1) * 100)}"><span>${Math.round((layer.opacity ?? 1) * 100)}</span> %`)}
          ${row('Fill:', `<input id="ls-lfill" type="range" min="0" max="100" value="${Math.round((layer.fill ?? 1) * 100)}"><span>${Math.round((layer.fill ?? 1) * 100)}</span> %`)}`
      } else {
        pane.innerHTML = `<h3>${effects.find(e => e[0] === id)?.[1] || id}</h3><p style="color:#aaa">Enable the checkbox to apply this effect.</p>`
      }
      pane.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', readFields)
        el.addEventListener('change', readFields)
      })
    }
    const readFields = () => {
      const g = id => pane.querySelector(id)
      const num = (id, fb) => g(id) ? +g(id).value : fb
      if (g('#ls-ss')) {
        fx.strokeSize = num('#ls-ss', fx.strokeSize)
        g('#ls-ssn') && (g('#ls-ssn').value = fx.strokeSize)
        fx.strokePos = g('#ls-sp')?.value || fx.strokePos
        fx.strokeBlend = g('#ls-sb')?.value || fx.strokeBlend
        fx.strokeOpacity = num('#ls-so', fx.strokeOpacity)
        const sov = pane.querySelector('#ls-sov')
        if (sov) sov.textContent = fx.strokeOpacity
        fx.strokeOverprint = !!g('#ls-ovp')?.checked
        fx.strokeColor = g('#ls-sc')?.value || fx.strokeColor
      }
      if (g('#ls-sho')) {
        fx.shadowOpacity = num('#ls-sho', fx.shadowOpacity)
        fx.shadowAngle = num('#ls-sha', fx.shadowAngle)
        fx.shadowDistance = num('#ls-shd', fx.shadowDistance)
        fx.shadowSize = num('#ls-shs', fx.shadowSize)
        fx.shadowColor = g('#ls-shc')?.value || fx.shadowColor
        pane.querySelectorAll('.form-row span').forEach((s, i) => {
          const vals = [fx.shadowOpacity, fx.shadowDistance, fx.shadowSize]
          if (vals[i] != null) s.textContent = vals[i]
        })
      }
      if (g('#ls-go')) { fx.glowOpacity = num('#ls-go', fx.glowOpacity); fx.glowSize = num('#ls-gs', fx.glowSize); fx.glowColor = g('#ls-gc')?.value }
      if (g('#ls-oo')) { fx.overlayOpacity = num('#ls-oo', fx.overlayOpacity); fx.overlayBlend = g('#ls-ob')?.value || fx.overlayBlend; fx.overlayColor = g('#ls-oc')?.value }
      if (g('#ls-iso')) { fx.innerShadowOpacity = num('#ls-iso', fx.innerShadowOpacity); fx.innerShadowDistance = num('#ls-isd', fx.innerShadowDistance); fx.innerShadowSize = num('#ls-iss', fx.innerShadowSize); fx.innerShadowColor = g('#ls-isc')?.value }
      if (g('#ls-igo')) { fx.innerGlowOpacity = num('#ls-igo', fx.innerGlowOpacity); fx.innerGlowSize = num('#ls-igs', fx.innerGlowSize); fx.innerGlowColor = g('#ls-igc')?.value }
      if (g('#ls-bs')) fx.bevelSize = num('#ls-bs', fx.bevelSize)
      if (g('#ls-grc')) fx.gradientColor = g('#ls-grc').value
      if (g('#ls-blend')) {
        layer.blend = g('#ls-blend').value
        layer.opacity = num('#ls-lop', 100) / 100
        layer.fill = num('#ls-lfill', 100) / 100
      }
      if (g('#ls-ss') && g('#ls-ssn')) {
        g('#ls-ss').oninput = () => { g('#ls-ssn').value = g('#ls-ss').value; readFields() }
        g('#ls-ssn').oninput = () => { g('#ls-ss').value = g('#ls-ssn').value; readFields() }
      }
      layer.fx = { ...fx }
      this.paint()
      this.drawStylePreview(preview, layer)
    }
    body.querySelectorAll('[data-pane]').forEach(b => {
      b.onclick = e => {
        if (e.target.dataset.fx) return
        renderPane(b.dataset.pane)
      }
    })
    body.querySelectorAll('[data-fx]').forEach(chk => {
      chk.addEventListener('click', e => e.stopPropagation())
      chk.addEventListener('change', () => {
        fx[chk.dataset.fx] = chk.checked
        layer.fx = { ...fx }
        this.paint()
        this.drawStylePreview(preview, layer)
      })
    })
    const wrap = modal({ title: 'Layer Style', body, hideFoot: true, cls: 'ls-modal', onOk: () => true })
    wrap.querySelector('.body').style.padding = '0'
    wrap.querySelector('#ls-ok').onclick = () => {
      layer.fx = { ...fx }
      this.doc.pushHistory('Layer Style')
      this.render()
      wrap.remove()
    }
    const revert = () => {
      layer.fx = orig
      layer.blend = origBlend
      layer.opacity = origOp
      layer.fill = origFill
      this.render()
    }
    wrap.querySelector('.modal-x').addEventListener('click', revert)
    wrap.addEventListener('click', e => { if (e.target === wrap) revert() })
    renderPane(openTo)
    this.drawStylePreview(preview, layer)
  },
  drawStylePreview(canvas, layer) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(0, 0, 72, 72)
    if (!layer?.canvas) return
    ctx.drawImage(layer.canvas, 8, 16, 56, 40)
  },
  strokeDialog() {
    const layer = this.doc.currentLayer()
    if (!layer || layer.locked) { toast('Layer is locked'); return }
    const snap = cloneCanvas(layer.canvas)
    const body = document.createElement('div')
    body.className = 'mini-dlg'
    body.innerHTML = `
      <div class="form-row"><label>Width:</label><input id="st-s" type="range" min="1" max="50" value="3"><input id="st-sn" type="number" min="1" max="50" value="3" style="width:48px"> px</div>
      <div class="form-row"><label>Location:</label><select id="st-p"><option value="inside">Inside</option><option value="center" selected>Center</option><option value="outside">Outside</option></select></div>
      <div class="form-row"><label>Blend Mode:</label>${this.blendSelect('st-b', 'source-over')}<span></span></div>
      <div class="form-row"><label>Opacity:</label><input id="st-o" type="range" min="0" max="100" value="100"><span id="st-ov">100%</span></div>
      <div class="form-row"><label>Color:</label><input id="st-c" type="color" value="${this.doc.fg}"></div>`
    const restore = () => {
      const c = layer.canvas.getContext('2d')
      c.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      c.drawImage(snap, 0, 0)
    }
    const live = () => {
      restore()
      const size = +body.querySelector('#st-s').value
      body.querySelector('#st-sn').value = size
      body.querySelector('#st-ov').textContent = body.querySelector('#st-o').value + '%'
      this.doc.strokePixels({
        color: body.querySelector('#st-c').value,
        size,
        pos: body.querySelector('#st-p').value,
        blend: body.querySelector('#st-b').value,
        opacity: +body.querySelector('#st-o').value / 100,
        record: false
      })
      this.paint()
    }
    body.querySelector('#st-s').oninput = live
    body.querySelector('#st-sn').oninput = () => { body.querySelector('#st-s').value = body.querySelector('#st-sn').value; live() }
    body.querySelector('#st-p').onchange = live
    body.querySelector('#st-b').onchange = live
    body.querySelector('#st-o').oninput = live
    body.querySelector('#st-c').oninput = live
    live()
    const wrap = modal({
      title: 'Stroke',
      body,
      onOk: () => {
        live()
        this.doc.pushHistory('Stroke')
        this.render()
      }
    })
    const revertStroke = () => { restore(); this.render() }
    wrap.querySelector('.cancel').onclick = () => { revertStroke(); wrap.remove() }
    wrap.querySelector('.modal-x').addEventListener('click', revertStroke)
    wrap.addEventListener('click', e => { if (e.target === wrap) revertStroke() })
  },
  fillDialog() {
    const layer = this.doc.currentLayer()
    if (!layer || layer.locked) { toast('Layer is locked'); return }
    const body = document.createElement('div')
    body.className = 'mini-dlg'
    body.innerHTML = `
      <div class="form-row"><label>Fill:</label>
        <select id="fl-src">
          <option value="fg">Foreground</option>
          <option value="bg">Background</option>
          <option value="color">Color</option>
        </select>
        <input id="fl-c" type="color" value="${this.doc.fg}" hidden>
      </div>
      <div class="form-row"><label>Blend Mode:</label>${this.blendSelect('fl-b', 'source-over')}</div>
      <div class="form-row"><label>Opacity:</label><input id="fl-o" type="range" min="0" max="100" value="100"><span id="fl-ov">100%</span></div>
      <div class="form-row"><label></label><label><input id="fl-pt" type="checkbox"${layer.lockTrans || !this.doc.selection ? ' checked' : ''}> Preserve Transparency</label></div>`
    body.querySelector('#fl-src').onchange = e => { body.querySelector('#fl-c').hidden = e.target.value !== 'color' }
    body.querySelector('#fl-o').oninput = e => { body.querySelector('#fl-ov').textContent = e.target.value + '%' }
    modal({
      title: 'Fill',
      body,
      onOk: () => {
        const src = body.querySelector('#fl-src').value
        const color = src === 'bg' ? this.doc.bg : src === 'color' ? body.querySelector('#fl-c').value : this.doc.fg
        this.doc.fillPixels({
          color,
          blend: body.querySelector('#fl-b').value,
          opacity: +body.querySelector('#fl-o').value / 100,
          preserve: body.querySelector('#fl-pt').checked
        })
        this.render()
      }
    })
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
    if (id === 'histogram') this.drawHistogram()
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
      color: false, adjust: false, layers: true, history: false, swatches: false,
      navigator: false, info: false, brush: false, character: false,
      paragraph: false, paths: false, channels: false, actions: false, properties: false, histogram: false
    })
    this.setScreenMode('standard')
    this.applyPanels()
    this.applyView()
    buildMenus(this)
  },
  textFont() {
    const s = this.tools.state
    return `${s.textItalic ? 'italic ' : ''}${s.textBold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`
  },
  syncTextLayer(ed = this._textEdit) {
    if (!ed?.layer) return
    const s = this.tools.state
    const layer = ed.layer
    layer.text = ed.text
    layer.color = ed.color
    layer.align = ed.align || 'left'
    layer.fontFamily = s.fontFamily
    layer.fontSize = s.fontSize
    layer.textBold = !!s.textBold
    layer.textItalic = !!s.textItalic
    layer.kind = 'text'
    const rendered = this.doc.renderTextLayer(layer)
    const ascent = rendered?.ascent || s.fontSize * 0.8 || 40
    const w = layer.canvas.width
    const ax = ed.align === 'center' ? w / 2 : ed.align === 'right' ? w : 0
    layer.x = Math.round(ed.x - ax)
    layer.y = Math.round(ed.y - ascent)
    if (ed.created || layer.name === 'Text' || layer.name === ed.orig?.trim().slice(0, 24)) {
      layer.name = ed.text.trim().slice(0, 24) || 'Text'
    }
    this.paint()
    renderLayers(this)
    syncLayerControls(this)
  },
  beginText(p, existing) {
    if (this._textEdit?.layer && existing && this._textEdit.layer === existing) {
      this.renderOverlay()
      return
    }
    this.commitText()
    const s = this.tools.state
    if (existing && existing.kind === 'text') {
      if (existing.locked) { this.toast('Layer is locked'); return }
      const i = this.doc.layers.indexOf(existing)
      if (i >= 0) this.doc.active = i
      s.fontFamily = existing.fontFamily || s.fontFamily
      s.fontSize = existing.fontSize || s.fontSize
      s.textBold = !!existing.textBold
      s.textItalic = !!existing.textItalic
      s.textAlign = existing.align || 'left'
      const w = existing.canvas?.width || 0
      const ax = existing.align === 'center' ? w / 2 : existing.align === 'right' ? w : 0
      this._textEdit = {
        layer: existing,
        x: existing.x + ax,
        y: existing.y + (existing.ascent || s.fontSize * 0.8 || 40),
        text: existing.text || '',
        orig: existing.text || '',
        created: false,
        color: existing.color || this.doc.fg,
        font: existing.font || this.textFont(),
        align: existing.align || 'left'
      }
      this.setTool('text')
    } else {
      const layer = this.doc.addLayer('Text')
      layer.kind = 'text'
      layer.text = ''
      layer.canvas = createCanvas(2, 2)
      layer.x = Math.round(p.x)
      layer.y = Math.round(p.y)
      layer.color = this.doc.fg
      layer.font = this.textFont()
      layer.align = s.textAlign || 'left'
      layer.fontFamily = s.fontFamily
      layer.fontSize = s.fontSize
      layer.textBold = !!s.textBold
      layer.textItalic = !!s.textItalic
      this.doc.active = this.doc.layers.indexOf(layer)
      this._textEdit = {
        layer,
        x: p.x,
        y: p.y,
        text: '',
        orig: '',
        created: true,
        color: this.doc.fg,
        font: this.textFont(),
        align: s.textAlign || 'left'
      }
      this.render()
    }
    this.renderOverlay()
  },
  commitText(cancel = false) {
    const ed = this._textEdit
    if (!ed) return
    this._textEdit = null
    const layer = ed.layer
    const text = cancel ? ed.orig : ed.text
    if (!text) {
      if (layer && (ed.created || !ed.orig)) {
        const i = this.doc.layers.indexOf(layer)
        if (i >= 0 && this.doc.layers.length > 1) {
          this.doc.layers.splice(i, 1)
          this.doc.active = Math.min(i, this.doc.layers.length - 1)
        }
      }
      this.render()
      this.renderOverlay()
      return
    }
    ed.text = text
    if (layer) this.syncTextLayer(ed)
    if (!cancel && text !== ed.orig) this.doc.pushHistory(ed.created ? 'Type' : 'Edit Type')
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
    else return true
    if (ed.layer) this.syncTextLayer(ed)
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
    this.doc.placeImage(this._clip, 'Pasted Image')
    this.render()
    toast('Pasted as new layer')
  },
  async pasteImageOnLayer(file, name = 'Pasted Image') {
    const url = URL.createObjectURL(file)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)
    this.doc.placeImage(img, name)
    this.render()
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
  app.doc.addBlankLayer()
  app.doc.pushHistory('New Layer')
  app.render()
}
document.getElementById('layer-dup').onclick = () => { app.doc.duplicateLayer(); app.render() }
document.getElementById('layer-merge').onclick = () => { app.doc.mergeSelected(); app.render() }
document.getElementById('layer-del').onclick = () => {
  app.doc.deleteLayer()
  app.render()
}
document.getElementById('layer-mask').onclick = () => { app.doc.addMask(); app.render() }
document.getElementById('layer-adj').onclick = () => { app.doc.addFillLayer(app.doc.fg); app.render() }
document.getElementById('layer-group').onclick = () => {
  app.doc.groupAll()
  app.render()
}
document.getElementById('layer-ungroup')?.addEventListener('click', () => {
  app.doc.ungroup()
  app.render()
})
document.getElementById('layer-fx').onclick = () => app.layerStyleDialog()
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
  if (l) { l.blend = e.target.value; app.doc.pushHistory('Blend Mode'); app.render() }
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

document.getElementById('btn-export').onclick = () => app.exportDialog()

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
  if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  renderOptions(app)
})
document.getElementById('char-size')?.addEventListener('input', e => {
  app.tools.state.fontSize = +e.target.value
  if (app._textEdit) { app._textEdit.font = app.textFont(); app.syncTextLayer(); app.renderOverlay() }
  renderOptions(app)
})
document.querySelectorAll('[data-para-align]').forEach(b => {
  b.onclick = () => {
    app.tools.state.textAlign = b.dataset.paraAlign
    if (app._textEdit) {
      app._textEdit.align = b.dataset.paraAlign
      app.syncTextLayer()
      app.renderOverlay()
    }
  }
})
fileOpen.onchange = e => { const f = e.target.files[0]; if (f) app.loadFromFile(f, false); e.target.value = '' }
filePlace.onchange = async e => {
  const files = [...e.target.files]
  const asLayers = e.target.dataset.mode === 'layers'
  for (const f of files) {
    await app.loadFromFile(f, true)
    if (!asLayers) break
  }
  e.target.value = ''
  delete e.target.dataset.mode
  e.target.multiple = false
}

wrap.addEventListener('pointerdown', e => {
  if (e.button !== 0) return
  if (app._textEdit && app.tool !== 'text') app.commitText()
  if (app.tool === 'text') {
    app.tools.down(e)
    return
  }
  if (app.tool === 'move' || app.tool === 'path') {
    const p = app.screenToDoc(e.clientX, e.clientY)
    const hit = app.doc.hitLayerAt(p.x, p.y)
    const hitLayer = hit >= 0 ? app.doc.layers[hit] : null
    if (hitLayer?.kind === 'text' && e.detail === 2) {
      app.beginText(p, hitLayer)
      return
    }
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
wrap.addEventListener('dblclick', e => {
  if (e.button !== 0) return
  if (app.tool !== 'move' && app.tool !== 'path' && app.tool !== 'text') return
  const p = app.screenToDoc(e.clientX, e.clientY)
  const hit = app.doc.hitLayerAt(p.x, p.y)
  const hitLayer = hit >= 0 ? app.doc.layers[hit] : null
  if (hitLayer?.kind === 'text') {
    e.preventDefault()
    app.beginText(p, hitLayer)
  }
})
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
    if (k === 'n' && e.shiftKey) { e.preventDefault(); app.doc.addBlankLayer(); app.doc.pushHistory('New Layer'); app.render() }
    else if (k === 'n') { e.preventDefault(); app.newDocDialog() }
    else if (k === 'o') { e.preventDefault(); app.openFile() }
    else if (k === 's' && e.shiftKey) { e.preventDefault(); app.exportDialog() }
    else if (k === 's') { e.preventDefault(); app.saveProject() }
    else if (k === 'z' && e.shiftKey) { e.preventDefault(); app.doc.redo() }
    else if (k === 'z') { e.preventDefault(); app.doc.undo() }
    else if (k === 'y') { e.preventDefault(); app.doc.redo() }
    else if (k === 'j' && e.shiftKey) { e.preventDefault(); app.doc.layerViaCopy(true) }
    else if (k === 'j') { e.preventDefault(); app.doc.selection ? app.doc.layerViaCopy(false) : app.doc.duplicateLayer() }
    else if (k === 'g' && e.altKey) { e.preventDefault(); app.doc.toggleClip() }
    else if (k === 'g' && e.shiftKey) { e.preventDefault(); app.doc.ungroup(); app.render() }
    else if (k === 'g') { e.preventDefault(); app.doc.groupAll(); app.render() }
    else if (k === 'e' && e.shiftKey) { e.preventDefault(); app.doc.mergeVisible(); app.render() }
    else if (k === 'e') { e.preventDefault(); app.doc.mergeSelected(); app.render() }
    else if (k === '[' && e.shiftKey) { e.preventDefault(); app.doc.sendToBack() }
    else if (k === ']' && e.shiftKey) { e.preventDefault(); app.doc.bringToFront() }
    else if (k === '[') { e.preventDefault(); app.doc.moveLayer(-1) }
    else if (k === ']') { e.preventDefault(); app.doc.moveLayer(1) }
    else if (k === 'a') { e.preventDefault(); app.selectAll() }
    else if (k === 'd') { e.preventDefault(); app.doc.selection = null; app.tools.state.selXf = false; app.render(); app.renderOverlay() }
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
  if (k === 'f5' && e.shiftKey) { e.preventDefault(); app.fillDialog(); return }
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
  else if (k === 'j') app.setTool(app.tool === 'heal' ? 'red-eye' : 'heal')
  else if (k === 'y') app.setTool('history-brush')
  else if (k === 'b') app.setTool(app.tool === 'brush' ? 'pencil' : 'brush')
  else if (k === 'e') app.setTool(app.tool === 'eraser' ? 'magic-eraser' : 'eraser')
  else if (k === 's') app.setTool('clone')
  else if (k === 'g') app.setTool(app.tool === 'gradient' ? 'fill' : 'gradient')
  else if (k === 't') app.setTool('text')
  else if (k === 'u') {
    const order = ['shape', 'round-rect', 'ellipse', 'triangle', 'line', 'poly']
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
    else { app.doc.selection = null; app.tools.state.selXf = false; app.renderOverlay() }
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
    const start = a.id === 'gamma' ? 100 : 0
    row.innerHTML = `<span>${a.label}</span><input type="range" min="${a.min}" max="${a.max}" value="${start}" data-id="${a.id}"><span class="val">${start}</span>`
    adjRoot.appendChild(row)
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
const adjBtns = document.createElement('div')
adjBtns.className = 'blend-row'
adjBtns.innerHTML = '<button type="button" id="adj-apply" class="btn-accent">Apply</button><button type="button" id="adj-reset">Reset</button><button type="button" id="adj-cancel">Cancel</button>'
adjRoot.parentElement.appendChild(adjBtns)
document.getElementById('adj-apply').onclick = () => app.commitAdjust()
document.getElementById('adj-reset').onclick = () => {
  app.resetAdjustSliders()
  if (app.adjBase) app.applyLiveAdjust()
}
document.getElementById('adj-cancel').onclick = () => app.cancelAdjust()

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
  if (!f) return
  const isProject = /\.(pixora|json)$/i.test(f.name)
  app.loadFromFile(f, !isProject && e.shiftKey)
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
