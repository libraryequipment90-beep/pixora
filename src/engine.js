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

export function defaultFx() {
  return {
    shadow: false, stroke: false, glow: false, overlay: false,
    bevel: false, innerShadow: false, innerGlow: false, satin: false,
    gradientOverlay: false, patternOverlay: false,
    strokeSize: 3, strokePos: 'outside', strokeBlend: 'source-over',
    strokeOpacity: 100, strokeColor: '#000000', strokeOverprint: false,
    shadowOpacity: 75, shadowAngle: 120, shadowDistance: 5, shadowSize: 5, shadowColor: '#000000',
    glowSize: 18, glowOpacity: 75, glowColor: '',
    overlayOpacity: 28, overlayBlend: 'overlay', overlayColor: '',
    innerShadowOpacity: 75, innerShadowDistance: 5, innerShadowSize: 5, innerShadowColor: '#000000',
    innerGlowSize: 10, innerGlowOpacity: 75, innerGlowColor: '',
    bevelSize: 5, gradientColor: ''
  }
}

export function ensureFx(layer) {
  if (!layer) return defaultFx()
  layer.fx = { ...defaultFx(), ...(layer.fx || {}) }
  return layer.fx
}

export function fxActive(fx) {
  if (!fx) return false
  return !!(fx.shadow || fx.stroke || fx.glow || fx.overlay || fx.bevel || fx.innerShadow || fx.innerGlow || fx.gradientOverlay)
}

function textMeta(l) {
  if (l.kind === 'group') return { kind: 'group', parentId: l.parentId || null, collapsed: !!l.collapsed }
  if (l.kind !== 'text') return { kind: l.kind || 'raster', parentId: l.parentId || null, collapsed: false }
  return {
    kind: 'text',
    text: l.text || '',
    font: l.font || '',
    color: l.color || '#000000',
    align: l.align || 'left',
    fontFamily: l.fontFamily || 'Arial',
    fontSize: l.fontSize || 48,
    textBold: !!l.textBold,
    textItalic: !!l.textItalic,
    ascent: l.ascent || 0,
    parentId: l.parentId || null,
    collapsed: false
  }
}

export function createCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function cloneCanvas(src) {
  const c = createCanvas(src.width, src.height)
  c.getContext('2d').drawImage(src, 0, 0)
  return c
}

function layerHasPixels(layer) {
  if (!layer?.canvas) return false
  const ctx = layer.canvas.getContext('2d')
  const w = layer.canvas.width, h = layer.canvas.height
  if (!w || !h || !ctx.getImageData) return false
  const data = ctx.getImageData(0, 0, w, h).data
  for (let i = 3; i < data.length; i += 4) if (data[i] > 8) return true
  return false
}

function morphMask(mask, w, h, r, dilate, ox, oy, rw, rh) {
  const tmp = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  const x0 = Math.max(0, ox), y0 = Math.max(0, oy)
  const x1 = Math.min(w, ox + rw), y1 = Math.min(h, oy + rh)
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let hit = dilate ? 0 : 1
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx
        if (xx < 0 || xx >= w) continue
        const v = mask[y * w + xx]
        if (dilate && v) { hit = 1; break }
        if (!dilate && !v) { hit = 0; break }
      }
      tmp[y * w + x] = hit
    }
  }
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let hit = dilate ? 0 : 1
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        const v = tmp[yy * w + x]
        if (dilate && v) { hit = 1; break }
        if (!dilate && !v) { hit = 0; break }
      }
      out[y * w + x] = hit
    }
  }
  return out
}

function alphaStrokeCanvas(src, size, pos) {
  const w = src.width, h = src.height
  const out = createCanvas(w, h)
  const sctx = src.getContext('2d')
  if (!w || !h || !sctx.getImageData) return out
  const data = sctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        mask[y * w + x] = 1
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return out
  const r = Math.max(1, Math.round(size))
  minX = Math.max(0, minX - r - 1)
  minY = Math.max(0, minY - r - 1)
  maxX = Math.min(w - 1, maxX + r + 1)
  maxY = Math.min(h - 1, maxY + r + 1)
  const rw = maxX - minX + 1, rh = maxY - minY + 1
  let outer = mask, inner = mask
  if (pos === 'inside') {
    outer = mask
    inner = morphMask(mask, w, h, r, false, minX, minY, rw, rh)
  } else if (pos === 'center') {
    const a = Math.max(1, Math.ceil(r / 2))
    const b = Math.max(0, Math.floor(r / 2))
    outer = morphMask(mask, w, h, a, true, minX, minY, rw, rh)
    inner = b ? morphMask(mask, w, h, b, false, minX, minY, rw, rh) : mask
  } else {
    outer = morphMask(mask, w, h, r, true, minX, minY, rw, rh)
    inner = mask
  }
  const octx = out.getContext('2d')
  const img = octx.createImageData ? octx.createImageData(w, h) : { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
  const px = img.data
  for (let i = 0; i < w * h; i++) {
    if (outer[i] && !inner[i]) px[i * 4 + 3] = 255
  }
  if (octx.putImageData) octx.putImageData(img, 0, 0)
  return out
}

function colorizeMask(mask, color, w, h) {
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = color || '#000000'
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0)
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
    this.selected = new Set()
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
      fx: defaultFx(),
      kind: 'raster',
      parentId: null,
      collapsed: false,
      x: 0,
      y: 0
    }
    const cur = this.layers[this.active]
    let insertAt = this.layers.length
    if (cur?.kind === 'group') {
      layer.parentId = cur.id
      insertAt = this.layers.indexOf(cur)
      this.layers.forEach((l, i) => { if (l.parentId === cur.id) insertAt = Math.max(insertAt, i) })
      insertAt += 1
    } else if (cur?.parentId) {
      layer.parentId = cur.parentId
      insertAt = this.layers.indexOf(cur) + 1
    }
    this.layers.splice(insertAt, 0, layer)
    this.active = this.layers.indexOf(layer)
    this.selected = new Set([layer.id])
    this.emit()
    return layer
  }

  copyLayerFields(src) {
    return {
      name: src.name,
      canvas: src.kind === 'group' ? createCanvas(1, 1) : cloneCanvas(src.canvas),
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
      fx: { ...defaultFx(), ...(src.fx || {}) },
      ...textMeta(src),
      x: src.x,
      y: src.y
    }
  }

  duplicateLayer() {
    const src = this.currentLayer()
    if (!src) return
    if (src.kind === 'group') {
      const clones = []
      const walk = (l, parentId) => {
        const copy = { id: uid(), ...this.copyLayerFields(l), parentId }
        clones.push(copy)
        this.layers.filter(k => k.parentId === l.id).forEach(k => walk(k, copy.id))
      }
      walk(src, src.parentId || null)
      clones[0].name = src.name + ' copy'
      const at = this.layers.indexOf(src)
      this.layers.splice(at + 1, 0, ...clones)
      this.active = this.layers.indexOf(clones[0])
      this.selected = new Set([clones[0].id])
      this.pushHistory('Duplicate Layer')
      this.emit()
      return
    }
    const layer = { id: uid(), ...this.copyLayerFields(src), name: src.name + ' copy' }
    this.layers.splice(this.active + 1, 0, layer)
    this.active += 1
    this.selected = new Set([layer.id])
    this.pushHistory('Duplicate Layer')
    this.emit()
  }

  selectedIndices() {
    const ids = this.selected
    if (ids && ids.size) {
      const idx = this.layers.map((l, i) => ids.has(l.id) ? i : -1).filter(i => i >= 0)
      if (idx.length) return idx
    }
    return this.layers[this.active] ? [this.active] : []
  }

  selectLayer(i, additive = false) {
    if (i < 0 || i >= this.layers.length) return
    const id = this.layers[i].id
    if (additive) {
      if (!this.selected) this.selected = new Set()
      if (this.selected.has(id) && this.selected.size > 1) this.selected.delete(id)
      else this.selected.add(id)
    } else {
      this.selected = new Set([id])
    }
    this.active = i
    this.emit()
  }

  groupSelected() {
    const idxs = this.selectedIndices()
    const picked = idxs.map(i => this.layers[i]).filter(Boolean)
    if (!picked.length) {
      const g = this.addLayer('Group')
      g.kind = 'group'
      g.name = 'Group'
      g.canvas = createCanvas(1, 1)
      const inner = this.addLayer('Layer 1')
      inner.parentId = g.id
      this.selected = new Set([g.id, inner.id])
      this.active = this.layers.indexOf(inner)
      this.pushHistory('New Group')
      this.emit()
      return g
    }
    const pickedIds = new Set(picked.map(l => l.id))
    const kids = picked.filter(l => {
      let p = l.parentId
      while (p) {
        if (pickedIds.has(p)) return false
        const par = this.layers.find(x => x.id === p)
        p = par ? par.parentId : null
      }
      return true
    })
    const sharedParent = kids.every(k => k.parentId === kids[0].parentId) ? (kids[0].parentId || null) : null
    const g = {
      id: uid(),
      name: 'Group',
      canvas: createCanvas(1, 1),
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
      fx: defaultFx(),
      kind: 'group',
      parentId: sharedParent,
      collapsed: false,
      x: 0,
      y: 0
    }
    const insertAt = Math.min(...kids.map(k => this.layers.indexOf(k)))
    const rest = this.layers.filter(l => !kids.includes(l))
    kids.forEach(k => { k.parentId = g.id })
    rest.splice(insertAt, 0, g, ...kids)
    this.layers = rest
    this.active = this.layers.indexOf(g)
    this.selected = new Set([g.id])
    this.pushHistory('Group Layers')
    this.emit()
    return g
  }

  ungroup(i = this.active) {
    const g = this.layers[i]
    if (!g || g.kind !== 'group') return
    this.layers.forEach(l => { if (l.parentId === g.id) l.parentId = g.parentId || null })
    this.layers.splice(i, 1)
    this.active = Math.min(i, this.layers.length - 1)
    const cur = this.layers[this.active]
    this.selected = cur ? new Set([cur.id]) : new Set()
    this.pushHistory('Ungroup Layers')
    this.emit()
  }

  deleteLayer() {
    const idxs = this.selectedIndices().sort((a, b) => b - a)
    const ids = new Set(idxs.map(i => this.layers[i]?.id).filter(Boolean))
    let grew = true
    while (grew) {
      grew = false
      for (const l of this.layers) {
        if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
          ids.add(l.id)
          grew = true
        }
      }
    }
    const keep = this.layers.filter(l => !ids.has(l.id))
    if (!keep.length) {
      this.layers = keep
      const leftover = this.addLayer('Layer 1')
      leftover.lockPos = false
      this.selected = new Set([leftover.id])
      this.active = 0
      this.pushHistory('Delete Layer')
      this.emit()
      return
    }
    this.layers = keep
    this.active = Math.min(this.active, this.layers.length - 1)
    const cur = this.layers[this.active]
    this.selected = cur ? new Set([cur.id]) : new Set()
    this.pushHistory('Delete Layer')
    this.emit()
  }

  mergeDown() {
    if (this.active <= 0) return
    const top = this.layers[this.active]
    const bot = this.layers[this.active - 1]
    if (!top || !bot || top.kind === 'group' || bot.kind === 'group') return
    const tmp = createCanvas(this.width, this.height)
    const t = tmp.getContext('2d')
    this.drawLayerPixels(t, bot)
    this.drawLayerPixels(t, top)
    bot.canvas = tmp
    bot.x = 0
    bot.y = 0
    bot.opacity = 1
    bot.fill = 1
    bot.blend = 'source-over'
    bot.mask = null
    bot.fx = defaultFx()
    bot.clip = false
    bot.kind = 'raster'
    this.layers.splice(this.active, 1)
    this.active -= 1
    this.selected = new Set([bot.id])
    this.pushHistory('Merge Down')
    this.emit()
  }

  flatten() {
    const out = createCanvas(this.width, this.height)
    this.compositeTo(out.getContext('2d'))
    const merged = {
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
      fx: defaultFx(),
      kind: 'raster',
      parentId: null,
      x: 0,
      y: 0
    }
    this.layers = [merged]
    this.active = 0
    this.selected = new Set([merged.id])
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
    const fx = ensureFx(layer)
    const op = layer.opacity ?? 1
    const hexToRgba = (hex, a) => {
      const h = (hex || '#000000').replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
    }
    const ang = (deg, dist) => {
      const r = (deg || 0) * Math.PI / 180
      return { x: Math.cos(r) * dist, y: -Math.sin(r) * dist }
    }

    if (fx.shadow) {
      const d = ang(fx.shadowAngle, fx.shadowDistance)
      ctx.save()
      ctx.globalAlpha = op * (fx.shadowOpacity / 100)
      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowColor = hexToRgba(fx.shadowColor || '#000000', 1)
      ctx.shadowBlur = fx.shadowSize
      ctx.shadowOffsetX = d.x
      ctx.shadowOffsetY = d.y
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }

    if (fx.glow) {
      ctx.save()
      ctx.globalAlpha = op * (fx.glowOpacity / 100)
      ctx.shadowColor = fx.glowColor || this.fg
      ctx.shadowBlur = fx.glowSize
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }

    if (fx.stroke && fx.strokePos === 'outside') {
      ctx.save()
      ctx.globalAlpha = op * (fx.strokeOpacity / 100)
      ctx.globalCompositeOperation = fx.strokeBlend || 'source-over'
      const ring = alphaStrokeCanvas(layer.canvas, fx.strokeSize || 1, 'outside')
      const tinted = colorizeMask(ring, fx.strokeColor || '#000000', layer.canvas.width, layer.canvas.height)
      ctx.drawImage(tinted, layer.x, layer.y)
      ctx.restore()
    }

    ctx.save()
    ctx.globalAlpha = op * fill
    ctx.globalCompositeOperation = layer.blend || 'source-over'
    ctx.drawImage(tmp, 0, 0)
    ctx.restore()

    if (fx.innerShadow) {
      const d = ang(fx.shadowAngle, fx.innerShadowDistance)
      ctx.save()
      ctx.globalAlpha = op * (fx.innerShadowOpacity / 100)
      ctx.globalCompositeOperation = 'source-atop'
      ctx.shadowColor = hexToRgba(fx.innerShadowColor || '#000000', 1)
      ctx.shadowBlur = fx.innerShadowSize
      ctx.shadowOffsetX = d.x
      ctx.shadowOffsetY = d.y
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }

    if (fx.innerGlow) {
      ctx.save()
      ctx.globalAlpha = op * (fx.innerGlowOpacity / 100)
      ctx.globalCompositeOperation = 'source-atop'
      ctx.shadowColor = fx.innerGlowColor || this.fg
      ctx.shadowBlur = fx.innerGlowSize
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }

    if (fx.bevel) {
      ctx.save()
      ctx.globalAlpha = 0.35 * op
      ctx.globalCompositeOperation = 'overlay'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = fx.bevelSize
      ctx.shadowOffsetX = -1
      ctx.shadowOffsetY = -1
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
    }

    if (fx.overlay) {
      ctx.save()
      ctx.globalAlpha = (fx.overlayOpacity / 100) * op
      ctx.globalCompositeOperation = fx.overlayBlend || 'overlay'
      ctx.fillStyle = fx.overlayColor || this.fg
      ctx.globalCompositeOperation = 'source-atop'
      const clipped = createCanvas(this.width, this.height)
      const c = clipped.getContext('2d')
      c.drawImage(tmp, 0, 0)
      c.globalCompositeOperation = 'source-in'
      c.fillStyle = fx.overlayColor || this.fg
      c.fillRect(0, 0, this.width, this.height)
      ctx.globalCompositeOperation = fx.overlayBlend || 'overlay'
      ctx.drawImage(clipped, 0, 0)
      ctx.restore()
    }

    if (fx.gradientOverlay) {
      ctx.save()
      ctx.globalAlpha = 0.45 * op
      const g = ctx.createLinearGradient(layer.x, layer.y, layer.x, layer.y + layer.canvas.height)
      g.addColorStop(0, fx.gradientColor || this.fg)
      g.addColorStop(1, 'transparent')
      const clipped = createCanvas(this.width, this.height)
      const c = clipped.getContext('2d')
      c.drawImage(tmp, 0, 0)
      c.globalCompositeOperation = 'source-in'
      c.fillStyle = g
      c.fillRect(0, 0, this.width, this.height)
      ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(clipped, 0, 0)
      ctx.restore()
    }

    if (fx.stroke && fx.strokePos !== 'outside') {
      ctx.save()
      ctx.globalAlpha = op * (fx.strokeOpacity / 100)
      ctx.globalCompositeOperation = fx.strokeBlend || 'source-over'
      const ring = alphaStrokeCanvas(layer.canvas, fx.strokeSize || 1, fx.strokePos || 'inside')
      const tinted = colorizeMask(ring, fx.strokeColor || '#000000', layer.canvas.width, layer.canvas.height)
      ctx.drawImage(tinted, layer.x, layer.y)
      ctx.restore()
    }
  }

  compositeLayers(ctx, list) {
    for (let i = 0; i < list.length; i++) {
      const layer = list[i]
      if (!layer.visible) continue
      if (layer.kind === 'group') {
        const kids = this.layers.filter(l => l.parentId === layer.id)
        if (!kids.length) continue
        const buf = createCanvas(this.width, this.height)
        const bctx = buf.getContext('2d')
        this.compositeLayers(bctx, kids)
        if (layer.mask && layer.maskEnabled !== false) {
          bctx.globalCompositeOperation = 'destination-in'
          bctx.drawImage(layer.mask, 0, 0)
        }
        ctx.save()
        ctx.globalAlpha = layer.opacity ?? 1
        ctx.globalCompositeOperation = layer.blend || 'source-over'
        ctx.drawImage(buf, 0, 0)
        ctx.restore()
        continue
      }
      if (layer.clip) {
        const base = list.slice(0, i).reverse().find(l => l.visible && !l.clip && l.kind !== 'group')
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
  }

  compositeTo(ctx, opts = {}) {
    ctx.clearRect(0, 0, this.width, this.height)
    this.compositeLayers(ctx, this.layers.filter(l => !l.parentId))
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
      selection: this.selection ? { ...this.selection, path: this.selection.path ? this.selection.path.map(p => ({ ...p })) : null } : null,
      selected: [...(this.selected || [])],
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
        fx: { ...defaultFx(), ...(l.fx || {}) },
        ...textMeta(l),
        parentId: l.parentId || null,
        collapsed: !!l.collapsed,
        x: l.x,
        y: l.y,
        canvas: l.kind === 'group' ? createCanvas(1, 1) : cloneCanvas(l.canvas)
      }))
    }
  }

  restore(snap) {
    this.width = snap.width
    this.height = snap.height
    this.name = snap.name
    this.active = snap.active
    this.selection = snap.selection ? { ...snap.selection, path: snap.selection.path ? snap.selection.path.map(p => ({ ...p })) : null } : null
    this.layers = snap.layers.map(l => ({
      id: l.id,
      name: l.name,
      canvas: l.kind === 'group' ? createCanvas(1, 1) : cloneCanvas(l.canvas),
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
      fx: { ...defaultFx(), ...(l.fx || {}) },
      ...textMeta(l),
      parentId: l.parentId || null,
      collapsed: !!l.collapsed,
      x: l.x,
      y: l.y
    }))
    this.selected = new Set(snap.selected?.length ? snap.selected : (this.layers[this.active] ? [this.layers[this.active].id] : []))
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

  selectionPath(ctx, s, ox = 0, oy = 0, reset = true) {
    if (reset) ctx.beginPath()
    if (s.path && s.path.length > 2) {
      ctx.moveTo(s.path[0].x - ox, s.path[0].y - oy)
      for (let i = 1; i < s.path.length; i++) ctx.lineTo(s.path[i].x - ox, s.path[i].y - oy)
      ctx.closePath()
      return
    }
    const x = s.x - ox
    const y = s.y - oy
    if (s.ellipse) ctx.ellipse(x + s.w / 2, y + s.h / 2, Math.max(0.5, s.w / 2), Math.max(0.5, s.h / 2), 0, 0, Math.PI * 2)
    else ctx.rect(x, y, s.w, s.h)
  }

  clipToSelection(ctx, ox = 0, oy = 0) {
    if (!this.selection) return
    const s = this.selection
    if (s.inverted) {
      ctx.beginPath()
      ctx.rect(-ox, -oy, this.width, this.height)
      this.selectionPath(ctx, s, ox, oy, false)
      ctx.clip('evenodd')
      return
    }
    this.selectionPath(ctx, s, ox, oy)
    ctx.clip()
  }

  pointInSelection(x, y) {
    const s = this.selection
    if (!s) return true
    let inside
    if (s.path && s.path.length > 2) {
      let hit = false
      for (let i = 0, j = s.path.length - 1; i < s.path.length; j = i++) {
        const a = s.path[i], b = s.path[j]
        if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-6) + a.x)) hit = !hit
      }
      inside = hit
    } else if (s.ellipse) {
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
      if (!l.visible || l.kind === 'group') continue
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
    if (layer.kind === 'group') {
      const kids = this.layers.filter(l => l.parentId === layer.id && l.kind !== 'group')
      if (!kids.length) return { x: 0, y: 0, w: 1, h: 1 }
      let x = Infinity, y = Infinity, r = -Infinity, b = -Infinity
      for (const k of kids) {
        x = Math.min(x, k.x)
        y = Math.min(y, k.y)
        r = Math.max(r, k.x + k.canvas.width)
        b = Math.max(b, k.y + k.canvas.height)
      }
      return { x, y, w: r - x, h: b - y }
    }
    return { x: layer.x, y: layer.y, w: layer.canvas.width, h: layer.canvas.height }
  }

  rasterizeText(layer) {
    if (!layer || layer.kind !== 'text') return
    layer.kind = 'raster'
    layer.text = ''
    layer.font = ''
  }

  textFontString(layer, size) {
    const px = Math.max(1, Math.round(size || 1))
    const italic = layer.textItalic ? 'italic ' : ''
    const bold = layer.textBold ? 'bold ' : ''
    return `${italic}${bold}${px}px ${layer.fontFamily || 'Arial'}`
  }

  renderTextLayer(layer, opts = {}) {
    if (!layer || layer.kind !== 'text') return null
    const size = Math.max(1, Math.round(opts.fontSize || layer.fontSize || 48))
    const font = this.textFontString(layer, size)
    const probe = createCanvas(1, 1).getContext('2d')
    probe.font = font
    const text = layer.text || ''
    const metrics = probe.measureText(text || ' ')
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || size * 0.8)
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * 0.2) || 2
    const w = Math.max(2, Math.ceil((text ? metrics.width : 2) + 4))
    const h = Math.max(2, ascent + descent + 4)
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.font = font
    ctx.fillStyle = layer.color || '#000000'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = layer.align || 'left'
    const tx = layer.align === 'center' ? w / 2 : layer.align === 'right' ? w - 2 : 2
    if (text) ctx.fillText(text, tx, ascent + 2)
    layer.canvas = canvas
    layer.font = font
    layer.fontSize = size
    layer.ascent = ascent
    return { canvas, ascent, descent, width: w, height: h }
  }

  scaleLayerTo(layer, x, y, w, h) {
    if (!layer || layer.locked || layer.lockPos || layer.kind === 'group') return
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    if (layer.kind === 'text') {
      const prevH = Math.max(1, layer.canvas.height)
      const ratio = h / prevH
      const nextSize = Math.max(1, (layer.fontSize || prevH) * ratio)
      this.renderTextLayer(layer, { fontSize: nextSize })
      layer.x = Math.round(x)
      layer.y = Math.round(y)
      if (layer.mask) {
        const m = createCanvas(layer.canvas.width, layer.canvas.height)
        m.getContext('2d').drawImage(layer.mask, 0, 0, layer.canvas.width, layer.canvas.height)
        layer.mask = m
      }
      return
    }
    this.rasterizeText(layer)
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

  rotateLayerFrom(layer, src, box, rad) {
    if (!layer || layer.locked || layer.lockPos || layer.kind === 'group') return
    this.rasterizeText(layer)
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad))
    const nw = Math.max(1, Math.round(src.width * cos + src.height * sin))
    const nh = Math.max(1, Math.round(src.width * sin + src.height * cos))
    const next = createCanvas(nw, nh)
    const ctx = next.getContext('2d')
    ctx.translate(nw / 2, nh / 2)
    ctx.rotate(rad)
    ctx.drawImage(src, -src.width / 2, -src.height / 2)
    layer.canvas = next
    layer.x = Math.round(box.x + box.w / 2 - nw / 2)
    layer.y = Math.round(box.y + box.h / 2 - nh / 2)
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
    const vis = this.layers.filter(l => l.visible && !l.lockPos && l.kind !== 'group')
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
    const sx = w / this.width, sy = h / this.height
    for (const layer of this.layers) {
      if (layer.kind === 'group') continue
      const nw = Math.max(1, Math.round(layer.canvas.width * sx))
      const nh = Math.max(1, Math.round(layer.canvas.height * sy))
      const next = createCanvas(nw, nh)
      next.getContext('2d').drawImage(layer.canvas, 0, 0, nw, nh)
      layer.canvas = next
      layer.x = Math.round(layer.x * sx)
      layer.y = Math.round(layer.y * sy)
      if (layer.mask) {
        const m = createCanvas(w, h)
        m.getContext('2d').drawImage(layer.mask, 0, 0, w, h)
        layer.mask = m
      }
    }
    this.width = w
    this.height = h
    this.pushHistory('Image Size')
    this.emit()
  }

  canvasSize(w, h, anchor = 'center') {
    w = Math.max(1, Math.round(w))
    h = Math.max(1, Math.round(h))
    let dx = 0, dy = 0
    if (anchor.includes('right') || anchor === 'right') dx = w - this.width
    else if (anchor === 'center' || anchor.includes('center') || !anchor.includes('left')) dx = Math.round((w - this.width) / 2)
    if (anchor.includes('bottom') || anchor === 'bottom') dy = h - this.height
    else if (anchor === 'center' || anchor.includes('center') || !anchor.includes('top')) dy = Math.round((h - this.height) / 2)
    if (anchor === 'top' || anchor === 'left' || anchor === 'top-left') { dx = dx || 0; if (anchor === 'top') dx = Math.round((w - this.width) / 2); if (anchor === 'left') dy = Math.round((h - this.height) / 2) }
    for (const layer of this.layers) {
      if (layer.kind === 'group') continue
      layer.x += dx
      layer.y += dy
    }
    this.width = w
    this.height = h
    this.pushHistory('Canvas Size')
    this.emit()
  }

  rotate(deg) {
    const rad = deg * Math.PI / 180
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad))
    const nw = Math.max(1, Math.round(this.width * cos + this.height * sin))
    const nh = Math.max(1, Math.round(this.width * sin + this.height * cos))
    for (const layer of this.layers) {
      if (layer.kind === 'group') continue
      const next = createCanvas(nw, nh)
      const ctx = next.getContext('2d')
      ctx.translate(nw / 2, nh / 2)
      ctx.rotate(rad)
      ctx.drawImage(layer.canvas, layer.x - this.width / 2, layer.y - this.height / 2)
      layer.canvas = next
      layer.x = 0
      layer.y = 0
    }
    this.width = nw
    this.height = nh
    this.pushHistory('Rotate')
    this.emit()
  }

  flip(horizontal) {
    const mirror = (src) => {
      const next = createCanvas(src.width, src.height)
      const ctx = next.getContext('2d')
      if (horizontal) {
        ctx.translate(src.width, 0)
        ctx.scale(-1, 1)
      } else {
        ctx.translate(0, src.height)
        ctx.scale(1, -1)
      }
      ctx.drawImage(src, 0, 0)
      return next
    }
    for (const layer of this.layers) {
      if (layer.kind === 'group') continue
      layer.canvas = mirror(layer.canvas)
      if (layer.mask) layer.mask = mirror(layer.mask)
      if (horizontal) layer.x = this.width - layer.x - layer.canvas.width
      else layer.y = this.height - layer.y - layer.canvas.height
    }
    this.pushHistory(horizontal ? 'Flip Horizontal' : 'Flip Vertical')
    this.emit()
  }

  cropTo(x, y, w, h) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h)
    for (const layer of this.layers) {
      if (layer.kind === 'group') continue
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
    this.fillPixels({ color, preserve: !!this.currentLayer()?.lockTrans })
  }

  clearSelection() {
    const layer = this.currentLayer()
    if (!layer || layer.locked || layer.kind === 'group') return
    this.rasterizeText(layer)
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

  mergeSelected() {
    const idxs = this.selectedIndices().filter(i => this.layers[i] && this.layers[i].kind !== 'group')
    if (idxs.length < 2) { this.mergeDown(); return }
    idxs.sort((a, b) => a - b)
    const target = this.layers[idxs[0]]
    const out = createCanvas(this.width, this.height)
    const ctx = out.getContext('2d')
    for (const i of idxs) this.drawLayerPixels(ctx, this.layers[i])
    const removeIds = new Set(idxs.slice(1).map(i => this.layers[i].id))
    target.canvas = out
    target.x = 0
    target.y = 0
    target.opacity = 1
    target.fill = 1
    target.blend = 'source-over'
    target.mask = null
    target.fx = defaultFx()
    target.clip = false
    target.kind = 'raster'
    this.layers = this.layers.filter(l => !removeIds.has(l.id))
    this.active = this.layers.indexOf(target)
    this.selected = new Set([target.id])
    this.pushHistory('Merge Layers')
    this.emit()
  }

  reparentLayer(from, to) {
    if (from === to || from < 0 || to < 0 || from >= this.layers.length || to >= this.layers.length) return
    const moved = this.layers[from]
    const target = this.layers[to]
    if (!moved || !target) return
    if (moved.kind === 'group') {
      let p = target.parentId
      while (p) {
        if (p === moved.id) return
        const par = this.layers.find(l => l.id === p)
        p = par ? par.parentId : null
      }
    }
    this.layers.splice(from, 1)
    const at = this.layers.indexOf(target)
    if (target.kind === 'group') {
      moved.parentId = target.id
      this.layers.splice(at + 1, 0, moved)
    } else {
      moved.parentId = target.parentId || null
      this.layers.splice(at, 0, moved)
    }
    this.active = this.layers.indexOf(moved)
    this.selected = new Set([moved.id])
    this.pushHistory('Reorder Layers')
    this.emit()
  }

  pruneOrphans(list) {
    const ids = new Set(list.map(l => l.id))
    let changed = true
    while (changed) {
      changed = false
      for (const l of list) {
        if (l.parentId && !ids.has(l.parentId) && ids.has(l.id)) {
          ids.delete(l.id)
          changed = true
        }
      }
    }
    return list.filter(l => ids.has(l.id))
  }

  mergeVisible() {
    const vis = this.layers.filter(l => l.visible && l.kind !== 'group')
    if (vis.length < 2) return
    const out = createCanvas(this.width, this.height)
    this.compositeTo(out.getContext('2d'))
    const keep = this.pruneOrphans(this.layers.filter(l => !l.visible))
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
      fx: defaultFx(),
      kind: 'raster',
      parentId: null,
      x: 0,
      y: 0
    }
    this.layers = [...keep, merged]
    this.active = this.layers.length - 1
    this.selected = new Set([merged.id])
    this.pushHistory('Merge Visible')
    this.emit()
  }

  addMask() {
    const layer = this.currentLayer()
    if (!layer || layer.kind === 'group') return
    if (!layer.mask) {
      layer.mask = createCanvas(this.width, this.height)
      const ctx = layer.mask.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.width, this.height)
      if (this.selection) {
        ctx.clearRect(0, 0, this.width, this.height)
        ctx.save()
        this.clipToSelection(ctx)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, this.width, this.height)
        ctx.restore()
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

  placeImage(img, name = 'Placed Image') {
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    const canvas = createCanvas(iw, ih)
    canvas.getContext('2d').drawImage(img, 0, 0)
    const layer = {
      id: uid(),
      name,
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
      fx: defaultFx(),
      kind: 'raster',
      parentId: null,
      x: Math.round((this.width - iw) / 2),
      y: Math.round((this.height - ih) / 2)
    }
    this.layers.push(layer)
    this.active = this.layers.length - 1
    this.selected = new Set([layer.id])
    this.pushHistory('Place')
    this.emit()
    return layer
  }

  async toProject() {
    const layers = []
    for (const l of this.layers) {
      layers.push({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        fill: l.fill ?? 1,
        blend: l.blend,
        locked: !!l.locked,
        lockPos: !!l.lockPos,
        lockTrans: !!l.lockTrans,
        maskEnabled: l.maskEnabled !== false,
        clip: !!l.clip,
        fx: { ...defaultFx(), ...(l.fx || {}) },
        ...textMeta(l),
        parentId: l.parentId || null,
        collapsed: !!l.collapsed,
        x: l.x,
        y: l.y,
        canvas: l.kind === 'group' ? null : l.canvas.toDataURL('image/png'),
        mask: l.mask ? l.mask.toDataURL('image/png') : null
      })
    }
    return {
      format: 'pixora',
      version: 1,
      width: this.width,
      height: this.height,
      name: this.name,
      fg: this.fg,
      bg: this.bg,
      active: this.active,
      layers
    }
  }

  toggleFx(kind) {
    const layer = this.currentLayer()
    if (!layer) return
    const fx = ensureFx(layer)
    fx[kind] = !fx[kind]
    const labels = { shadow: 'Drop Shadow', stroke: 'Stroke', glow: 'Outer Glow', overlay: 'Color Overlay' }
    this.pushHistory(labels[kind] || 'Layer Style')
    this.emit()
  }

  applyFx(next) {
    const layer = this.currentLayer()
    if (!layer) return
    layer.fx = { ...defaultFx(), ...(next || {}) }
    this.pushHistory('Layer Style')
    this.emit()
  }

  fillPixels({ color, blend = 'source-over', opacity = 1, preserve = false, record = true }) {
    const layer = this.currentLayer()
    if (!layer || layer.locked || layer.kind === 'group') return
    this.rasterizeText(layer)
    const ctx = layer.canvas.getContext('2d')
    const keepAlpha = (preserve || layer.lockTrans) && layerHasPixels(layer)
    ctx.save()
    this.clipToSelection(ctx, layer.x, layer.y)
    ctx.globalCompositeOperation = keepAlpha ? 'source-atop' : (blend || 'source-over')
    ctx.globalAlpha = opacity
    ctx.fillStyle = color
    ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.restore()
    if (record) this.pushHistory('Fill')
    this.emit()
  }

  strokePixels({ color, size = 3, pos = 'center', blend = 'source-over', opacity = 1, record = true }) {
    const layer = this.currentLayer()
    if (!layer || layer.locked || layer.kind === 'group') return
    this.rasterizeText(layer)
    const ctx = layer.canvas.getContext('2d')
    const w = Math.max(1, Math.round(size))
    ctx.save()
    ctx.globalCompositeOperation = blend || 'source-over'
    ctx.globalAlpha = opacity
    ctx.strokeStyle = color || this.fg
    ctx.fillStyle = color || this.fg
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    if (this.selection) {
      const s = this.selection
      if (pos === 'inside') {
        this.selectionPath(ctx, s, layer.x, layer.y)
        ctx.clip()
        ctx.beginPath()
        this.selectionPath(ctx, s, layer.x, layer.y)
        ctx.lineWidth = w * 2
        ctx.stroke()
      } else if (pos === 'outside') {
        ctx.beginPath()
        ctx.rect(-layer.x, -layer.y, this.width, this.height)
        this.selectionPath(ctx, s, layer.x, layer.y, false)
        ctx.clip('evenodd')
        ctx.beginPath()
        this.selectionPath(ctx, s, layer.x, layer.y)
        ctx.lineWidth = w * 2
        ctx.stroke()
      } else {
        this.selectionPath(ctx, s, layer.x, layer.y)
        ctx.lineWidth = w
        ctx.stroke()
      }
    } else if (layerHasPixels(layer)) {
      const ring = alphaStrokeCanvas(layer.canvas, w, pos || 'outside')
      const tinted = colorizeMask(ring, color || this.fg, layer.canvas.width, layer.canvas.height)
      ctx.drawImage(tinted, 0, 0)
    } else {
      ctx.lineWidth = w
      ctx.strokeRect(w / 2, w / 2, Math.max(1, layer.canvas.width - w), Math.max(1, layer.canvas.height - w))
    }
    ctx.restore()
    if (record) this.pushHistory('Stroke')
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
    const content = createCanvas(this.width, this.height)
    this.compositeTo(content.getContext('2d'))
    let out = content
    if (type === 'image/jpeg') {
      out = createCanvas(this.width, this.height)
      const ctx = out.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.drawImage(content, 0, 0)
    }
    return new Promise(res => out.toBlob(res, type, quality))
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

function dataUrlToCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = createCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height)
      c.getContext('2d').drawImage(img, 0, 0)
      resolve(c)
    }
    img.onerror = reject
    img.src = url
  })
}

export async function documentFromProject(data) {
  const doc = new Document(data.width || 1200, data.height || 800, null)
  doc.layers = []
  doc.name = data.name || 'Untitled'
  doc.fg = data.fg || '#000000'
  doc.bg = data.bg || '#ffffff'
  for (const l of data.layers || []) {
    const canvas = l.kind === 'group' ? createCanvas(1, 1) : await dataUrlToCanvas(l.canvas)
    const layer = {
      id: l.id || uid(),
      name: l.name || 'Layer',
      canvas,
      visible: l.visible !== false,
      opacity: l.opacity ?? 1,
      fill: l.fill ?? 1,
      blend: l.blend || 'source-over',
      locked: !!l.locked,
      lockPos: !!l.lockPos,
      lockTrans: !!l.lockTrans,
      mask: l.mask ? await dataUrlToCanvas(l.mask) : null,
      maskEnabled: l.maskEnabled !== false,
      clip: !!l.clip,
      fx: { ...defaultFx(), ...(l.fx || {}) },
      ...textMeta(l),
      parentId: l.parentId || null,
      collapsed: !!l.collapsed,
      x: l.x || 0,
      y: l.y || 0
    }
    doc.layers.push(layer)
  }
  if (!doc.layers.length) doc.addLayer('Background', '#ffffff')
  doc.active = Math.min(data.active ?? doc.layers.length - 1, doc.layers.length - 1)
  const cur = doc.layers[doc.active]
  doc.selected = cur ? new Set([cur.id]) : new Set()
  doc.history = []
  doc.histIndex = -1
  doc.pushHistory('Open Project')
  return doc
}
