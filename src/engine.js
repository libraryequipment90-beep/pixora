export const BLEND_MODES = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity'
]

export const BLEND_LABELS = {
  'source-over': 'Normal',
  'multiply': 'Multiply',
  'screen': 'Screen',
  'overlay': 'Overlay',
  'darken': 'Darken',
  'lighten': 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  'difference': 'Difference',
  'exclusion': 'Exclusion',
  'hue': 'Hue',
  'saturation': 'Saturation',
  'color': 'Color',
  'luminosity': 'Luminosity'
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export function createCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function cloneCanvas(src) {
  const c = createCanvas(src.width, src.height)
  c.getContext('2d').drawImage(src, 0, 0)
  return c
}

export class Document {
  constructor(w = 1200, h = 800, bg = '#ffffff') {
    this.width = w
    this.height = h
    this.name = 'Untitled'
    this.layers = []
    this.active = 0
    this.selection = null
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.history = []
    this.histIndex = -1
    this.maxHistory = 40
    this.listeners = new Set()
    this.fg = '#000000'
    this.bg = '#ffffff'
    this.dirty = true
    const bgLayer = this.addLayer('Background', bg)
    if (bg) bgLayer.lockPos = true
    this.pushHistory('New Document')
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  emit(type = 'change') {
    this.dirty = true
    for (const fn of this.listeners) fn(type)
  }

  addLayer(name, fill = null) {
    const canvas = createCanvas(this.width, this.height)
    const ctx = canvas.getContext('2d')
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, this.width, this.height)
    }
    const layer = {
      id: uid(),
      name: name || `Layer ${this.layers.length + 1}`,
      canvas,
      visible: true,
      opacity: 1,
      fill: 1,
      blend: 'source-over',
      locked: false,
      lockPos: false,
      lockTrans: false,
      mask: null,
      maskEnabled: true,
      clip: false,
      fx: { shadow: false, stroke: false, glow: false, overlay: false },
      x: 0,
      y: 0
    }
    this.layers.push(layer)
    this.active = this.layers.length - 1
    this.emit()
    return layer
  }

  duplicateLayer() {
    const src = this.currentLayer()
    if (!src) return
    const layer = {
      id: uid(),
      name: src.name + ' copy',
      canvas: cloneCanvas(src.canvas),
      visible: src.visible,
      opacity: src.opacity,
      fill: src.fill ?? 1,
      blend: src.blend,
      locked: false,
      lockPos: false,
      lockTrans: false,
      mask: src.mask ? cloneCanvas(src.mask) : null,
      maskEnabled: src.maskEnabled !== false,
      clip: !!src.clip,
      fx: { ...(src.fx || { shadow: false, stroke: false, glow: false, overlay: false }) },
      x: src.x,
      y: src.y
    }
    this.layers.splice(this.active + 1, 0, layer)
    this.active += 1
    this.pushHistory('Duplicate Layer')
    this.emit()
  }

  deleteLayer() {
    if (this.layers.length <= 1) {
      const leftover = this.layers[0]
      leftover.canvas.getContext('2d').clearRect(0, 0, leftover.canvas.width, leftover.canvas.height)
      leftover.name = 'Layer 1'
      leftover.opacity = 1
      leftover.fill = 1
      leftover.blend = 'source-over'
      leftover.locked = false
      leftover.lockPos = false
      leftover.lockTrans = false
      leftover.mask = null
      leftover.clip = false
      leftover.fx = { shadow: false, stroke: false, glow: false, overlay: false }
      leftover.visible = true
      leftover.x = 0
      leftover.y = 0
      this.active = 0
      this.pushHistory('Delete Layer')
      this.emit()
      return
    }
    this.layers.splice(this.active, 1)
    this.active = Math.min(this.active, this.layers.length - 1)
    this.pushHistory('Delete Layer')
    this.emit()
  }

  mergeDown() {
    if (this.active <= 0) return
    const top = this.layers[this.active]
    const bot = this.layers[this.active - 1]
    const ctx = bot.canvas.getContext('2d')
    ctx.save()
    ctx.globalAlpha = top.opacity
    ctx.globalCompositeOperation = top.blend
    ctx.drawImage(top.canvas, top.x - bot.x, top.y - bot.y)
    ctx.restore()
    this.layers.splice(this.active, 1)
    this.active -= 1
    this.pushHistory('Merge Down')
    this.emit()
  }

  flatten() {
    const out = createCanvas(this.width, this.height)
    this.compositeTo(out.getContext('2d'))
    this.layers = [{
      id: uid(),
      name: 'Background',
      canvas: out,
      visible: true,
      opacity: 1,
      blend: 'source-over',
      locked: false,
      lockPos: true,
      lockTrans: false,
      fill: 1,
      mask: null,
      maskEnabled: true,
      clip: false,
      fx: { shadow: false, stroke: false, glow: false, overlay: false },
      x: 0,
      y: 0
    }]
    this.active = 0
    this.pushHistory('Flatten Image')
    this.emit()
  }

  currentLayer() {
    return this.layers[this.active] || null
  }

  currentCtx() {
    const l = this.currentLayer()
    return l ? l.canvas.getContext('2d') : null
  }

  rasterizeLayer(layer) {
    const tmp = createCanvas(this.width, this.height)
    const t = tmp.getContext('2d')
    t.drawImage(layer.canvas, layer.x, layer.y)
    if (layer.mask && layer.maskEnabled !== false) {
      t.globalCompositeOperation = 'destination-in'
      t.drawImage(layer.mask, 0, 0)
    }
    return tmp
  }

  drawLayerPixels(ctx, layer) {
    const tmp = this.rasterizeLayer(layer)
    const fill = layer.fill == null ? 1 : layer.fill
    ctx.save()
    ctx.globalAlpha = (layer.opacity ?? 1) * fill
    ctx.globalCompositeOperation = layer.blend || 'source-over'
    if (layer.fx?.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.55)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 4
      ctx.shadowOffsetY = 4
    }
    if (layer.fx?.glow) {
      ctx.shadowColor = this.fg
      ctx.shadowBlur = 18
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()
    if (layer.fx?.overlay) {
      ctx.save()
      ctx.globalAlpha = 0.28 * (layer.opacity ?? 1)
      ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }
    if (layer.fx?.stroke) {
      ctx.save()
      ctx.globalAlpha = layer.opacity ?? 1
      ctx.strokeStyle = this.fg
      ctx.lineWidth = 2
      ctx.strokeRect(layer.x + 1, layer.y + 1, layer.canvas.width - 2, layer.canvas.height - 2)
      ctx.restore()
    }
  }

  compositeTo(ctx, opts = {}) {
    ctx.clearRect(0, 0, this.width, this.height)
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      if (!layer.visible) continue
      if (layer.clip) {
        const base = this.layers.slice(0, i).reverse().find(l => l.visible && !l.clip)
        if (!base) continue
        const clipped = createCanvas(this.width, this.height)
        const c = clipped.getContext('2d')
        this.drawLayerPixels(c, layer)
        c.globalCompositeOperation = 'destination-in'
        c.drawImage(this.rasterizeLayer(base), 0, 0)
        ctx.save()
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(clipped, 0, 0)
        ctx.restore()
        continue
      }
      this.drawLayerPixels(ctx, layer)
    }
    if (opts.selection && this.selection) {
      ctx.save()
      ctx.strokeStyle = '#0d99ff'
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 1
      ctx.strokeRect(this.selection.x + 0.5, this.selection.y + 0.5, this.selection.w, this.selection.h)
      ctx.restore()
    }
  }

  snapshot() {
    return {
      width: this.width,
      height: this.height,
      name: this.name,
      active: this.active,
      selection: this.selection ? { ...this.selection } : null,
      layers: this.layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        fill: l.fill ?? 1,
        blend: l.blend,
        locked: l.locked,
        lockPos: !!l.lockPos,
        lockTrans: !!l.lockTrans,
        mask: l.mask ? cloneCanvas(l.mask) : null,
        maskEnabled: l.maskEnabled !== false,
        clip: !!l.clip,
        fx: { ...(l.fx || { shadow: false, stroke: false, glow: false, overlay: false }) },
        x: l.x,
        y: l.y,
        canvas: cloneCanvas(l.canvas)
      }))
    }
  }

  restore(snap) {
    this.width = snap.width
    this.height = snap.height
    this.name = snap.name
    this.active = snap.active
    this.selection = snap.selection
    this.layers = snap.layers.map(l => ({
      id: l.id,
      name: l.name,
      canvas: cloneCanvas(l.canvas),
      visible: l.visible,
      opacity: l.opacity,
      fill: l.fill ?? 1,
      blend: l.blend,
      locked: l.locked,
      lockPos: !!l.lockPos,
      lockTrans: !!l.lockTrans,
      mask: l.mask ? cloneCanvas(l.mask) : null,
      maskEnabled: l.maskEnabled !== false,
      clip: !!l.clip,
      fx: { ...(l.fx || { shadow: false, stroke: false, glow: false, overlay: false }) },
      x: l.x,
      y: l.y
    }))
    this.emit('restore')
  }

  pushHistory(label) {
    this.history = this.history.slice(0, this.histIndex + 1)
    this.history.push({ label, snap: this.snapshot() })
    if (this.history.length > this.maxHistory) this.history.shift()
    this.histIndex = this.history.length - 1
    this.emit('history')
  }

  undo() {
    if (this.histIndex <= 0) return
    this.histIndex -= 1
    this.restore(this.history[this.histIndex].snap)
  }

  redo() {
    if (this.histIndex >= this.history.length - 1) return
    this.histIndex += 1
    this.restore(this.history[this.histIndex].snap)
  }

  clipToSelection(ctx, ox = 0, oy = 0) {
    if (!this.selection) return
    const s = this.selection
    const x = s.x - ox
    const y = s.y - oy
    ctx.beginPath()
    if (s.inverted) {
      ctx.rect(-ox, -oy, this.width, this.height)
      if (s.ellipse) ctx.ellipse(x + s.w / 2, y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
      else ctx.rect(x, y, s.w, s.h)
      ctx.clip('evenodd')
      return
    }
    if (s.ellipse) {
      ctx.ellipse(x + s.w / 2, y + s.h / 2, Math.max(0.5, s.w / 2), Math.max(0.5, s.h / 2), 0, 0, Math.PI * 2)
    } else {
      ctx.rect(x, y, s.w, s.h)
    }
    ctx.clip()
  }

  pointInSelection(x, y) {
    const s = this.selection
    if (!s) return true
    let inside
    if (s.ellipse) {
      const rx = s.w / 2, ry = s.h / 2
      if (rx < 0.5 || ry < 0.5) inside = false
      else {
        const dx = (x - (s.x + rx)) / rx
        const dy = (y - (s.y + ry)) / ry
        inside = dx * dx + dy * dy <= 1
      }
    } else {
      inside = x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h
    }
    return s.inverted ? !inside : inside
  }

  layerViaCopy(cut = false) {
    const src = this.currentLayer()
    if (!src) return
    const s = this.selection
    if (!s) {
      this.duplicateLayer()
      return
    }
    const layer = this.addLayer(cut ? 'Layer via Cut' : 'Layer via Copy')
    const ctx = layer.canvas.getContext('2d')
    ctx.save()
    this.clipToSelection(ctx)
    ctx.drawImage(src.canvas, src.x, src.y)
    ctx.restore()
    if (cut) {
      const sc = src.canvas.getContext('2d')
      sc.save()
      this.clipToSelection(sc, src.x, src.y)
      sc.clearRect(0, 0, src.canvas.width, src.canvas.height)
      sc.restore()
    }
    this.pushHistory(cut ? 'Layer via Cut' : 'Layer via Copy')
    this.emit()
  }

  hitLayerAt(x, y, opts = {}) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i]
      if (!l.visible) continue
      if (opts.skipLockPos && (l.lockPos || l.locked)) continue
      const px = Math.floor(x - l.x)
      const py = Math.floor(y - l.y)
      if (px < 0 || py < 0 || px >= l.canvas.width || py >= l.canvas.height) continue
      const p = l.canvas.getContext('2d').getImageData(px, py, 1, 1).data
      if (p[3] > 10) return i
    }
    return -1
  }

  layerBox(layer = this.currentLayer()) {
    if (!layer) return null
    return { x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height }
  }

  scaleLayerTo(layer, x, y, w, h) {
    if (!layer || layer.locked || layer.lockPos) return
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    const next = createCanvas(w, h)
    next.getContext('2d').drawImage(layer.canvas, 0, 0, w, h)
    layer.canvas = next
    if (layer.mask) {
      const m = createCanvas(w, h)
      m.getContext('2d').drawImage(layer.mask, 0, 0, w, h)
      layer.mask = m
    }
    layer.x = Math.round(x)
    layer.y = Math.round(y)
  }

  alignLayer(kind) {
    const layer = this.currentLayer()
    if (!layer || layer.lockPos || layer.locked) return
    const b = this.layerBox(layer)
    if (kind === 'left') layer.x = 0
    else if (kind === 'hcenter') layer.x = Math.round((this.width - b.w) / 2)
    else if (kind === 'right') layer.x = this.width - b.w
    else if (kind === 'top') layer.y = 0
    else if (kind === 'vcenter') layer.y = Math.round((this.height - b.h) / 2)
    else if (kind === 'bottom') layer.y = this.height - b.h
    this.pushHistory('Align')
    this.emit()
  }

  distributeLayers(axis) {
    const vis = this.layers.filter(l => l.visible && !l.lockPos)
    if (vis.length < 3) return
    const boxes = vis.map(l => ({ l, ...this.layerBox(l) }))
    if (axis === 'h') {
      boxes.sort((a, b) => a.x - b.x)
      const span = boxes[boxes.length - 1].x - boxes[0].x
      const step = span / (boxes.length - 1)
      boxes.forEach((b, i) => { b.l.x = Math.round(boxes[0].x + step * i) })
    } else {
      boxes.sort((a, b) => a.y - b.y)
      const span = boxes[boxes.length - 1].y - boxes[0].y
      const step = span / (boxes.length - 1)
      boxes.forEach((b, i) => { b.l.y = Math.round(boxes[0].y + step * i) })
    }
    this.pushHistory('Distribute')
    this.emit()
  }

  resize(w, h) {
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    for (const layer of this.layers) {
      const next = createCanvas(w, h)
      next.getContext('2d').drawImage(layer.canvas, 0, 0)
      layer.canvas = next
      if (layer.mask) {
        const m = createCanvas(w, h)
        m.getContext('2d').drawImage(layer.mask, 0, 0)
        layer.mask = m
      }
    }
    this.width = w
    this.height = h
    this.pushHistory('Image Size')
    this.emit()
  }

  cropTo(x, y, w, h) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h)
    for (const layer of this.layers) {
      const next = createCanvas(w, h)
      next.getContext('2d').drawImage(layer.canvas, layer.x - x, layer.y - y)
      layer.canvas = next
      if (layer.mask) {
        const m = createCanvas(w, h)
        m.getContext('2d').drawImage(layer.mask, -x, -y)
        layer.mask = m
      }
      layer.x = 0
      layer.y = 0
    }
    this.width = w
    this.height = h
    this.selection = null
    this.pushHistory('Crop')
    this.emit()
  }

  fillSelection(color) {
    const layer = this.currentLayer()
    if (!layer || layer.locked) return
    const ctx = layer.canvas.getContext('2d')
    ctx.save()
    this.clipToSelection(ctx, layer.x, layer.y)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.restore()
    this.pushHistory('Fill')
    this.emit()
  }

  clearSelection() {
    const layer = this.currentLayer()
    if (!layer || layer.locked) return
    const ctx = layer.canvas.getContext('2d')
    ctx.save()
    this.clipToSelection(ctx, layer.x, layer.y)
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.restore()
    this.pushHistory('Clear')
    this.emit()
  }

  goToHistory(i) {
    if (i < 0 || i >= this.history.length) return
    this.histIndex = i
    this.restore(this.history[i].snap)
  }

  moveLayer(dir) {
    const i = this.active
    const j = i + dir
    if (j < 0 || j >= this.layers.length) return
    const tmp = this.layers[i]
    this.layers[i] = this.layers[j]
    this.layers[j] = tmp
    this.active = j
    this.pushHistory(dir > 0 ? 'Bring Forward' : 'Send Backward')
    this.emit()
  }

  bringToFront() {
    if (this.active >= this.layers.length - 1) return
    const [layer] = this.layers.splice(this.active, 1)
    this.layers.push(layer)
    this.active = this.layers.length - 1
    this.pushHistory('Bring to Front')
    this.emit()
  }

  sendToBack() {
    if (this.active <= 0) return
    const [layer] = this.layers.splice(this.active, 1)
    this.layers.unshift(layer)
    this.active = 0
    this.pushHistory('Send to Back')
    this.emit()
  }

  mergeVisible() {
    const vis = this.layers.filter(l => l.visible)
    if (vis.length < 2) return
    const out = createCanvas(this.width, this.height)
    const ctx = out.getContext('2d')
    for (const layer of vis) this.drawLayerPixels(ctx, layer)
    const keep = this.layers.filter(l => !l.visible)
    const merged = {
      id: uid(),
      name: 'Merged',
      canvas: out,
      visible: true,
      opacity: 1,
      fill: 1,
      blend: 'source-over',
      locked: false,
      lockPos: false,
      lockTrans: false,
      mask: null,
      maskEnabled: true,
      clip: false,
      fx: { shadow: false, stroke: false, glow: false, overlay: false },
      x: 0,
      y: 0
    }
    this.layers = [...keep, merged]
    this.active = this.layers.length - 1
    this.pushHistory('Merge Visible')
    this.emit()
  }

  addMask() {
    const layer = this.currentLayer()
    if (!layer) return
    if (!layer.mask) {
      layer.mask = createCanvas(this.width, this.height)
      const ctx = layer.mask.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.width, this.height)
      if (this.selection) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, this.width, this.height)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        const s = this.selection
        if (s.ellipse) ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
        else ctx.rect(s.x, s.y, s.w, s.h)
        ctx.fill()
      }
    }
    layer.maskEnabled = true
    this.pushHistory('Add Layer Mask')
    this.emit()
  }

  deleteMask() {
    const layer = this.currentLayer()
    if (!layer || !layer.mask) return
    layer.mask = null
    this.pushHistory('Delete Layer Mask')
    this.emit()
  }

  disableMask() {
    const layer = this.currentLayer()
    if (!layer || !layer.mask) return
    layer.maskEnabled = !layer.maskEnabled
    this.pushHistory(layer.maskEnabled ? 'Enable Mask' : 'Disable Mask')
    this.emit()
  }

  applyMask() {
    const layer = this.currentLayer()
    if (!layer || !layer.mask) return
    const next = createCanvas(layer.canvas.width, layer.canvas.height)
    const ctx = next.getContext('2d')
    ctx.drawImage(layer.canvas, 0, 0)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(layer.mask, -layer.x, -layer.y)
    layer.canvas = next
    layer.mask = null
    this.pushHistory('Apply Layer Mask')
    this.emit()
  }

  addFillLayer(color) {
    const layer = this.addLayer('Color Fill')
    const ctx = layer.canvas.getContext('2d')
    ctx.fillStyle = color || this.fg
    ctx.fillRect(0, 0, this.width, this.height)
    this.pushHistory('New Fill Layer')
    this.emit()
    return layer
  }

  hideOthers() {
    const cur = this.currentLayer()
    for (const l of this.layers) l.visible = l === cur
    this.emit()
  }

  showAll() {
    for (const l of this.layers) l.visible = true
    this.emit()
  }

  toggleFx(kind) {
    const layer = this.currentLayer()
    if (!layer) return
    if (!layer.fx) layer.fx = { shadow: false, stroke: false, glow: false, overlay: false }
    layer.fx[kind] = !layer.fx[kind]
    const labels = { shadow: 'Drop Shadow', stroke: 'Stroke', glow: 'Outer Glow', overlay: 'Color Overlay' }
    this.pushHistory(labels[kind] || 'Layer Style')
    this.emit()
  }

  toggleClip() {
    const layer = this.currentLayer()
    if (!layer || this.active <= 0) return
    layer.clip = !layer.clip
    this.pushHistory(layer.clip ? 'Create Clipping Mask' : 'Release Clipping Mask')
    this.emit()
  }

  exportBlob(type = 'image/png', quality = 0.92) {
    const c = createCanvas(this.width, this.height)
    this.compositeTo(c.getContext('2d'))
    return new Promise(res => c.toBlob(res, type, quality))
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function documentFromImage(img, name = 'Untitled') {
  const doc = new Document(img.naturalWidth || img.width, img.naturalHeight || img.height, null)
  doc.layers = []
  const layer = doc.addLayer('Background', null)
  layer.canvas.getContext('2d').drawImage(img, 0, 0)
  layer.locked = false
  layer.lockPos = true
  doc.name = name
  doc.history = []
  doc.histIndex = -1
  doc.pushHistory('Open')
  return doc
}
