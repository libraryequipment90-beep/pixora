import { Document } from './engine.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function mockCanvas() {
  class Ctx {
    constructor(c) { this.c = c; this._ops = [] }
    fillRect() {}
    clearRect() {}
    drawImage() {}
    save() {}
    restore() {}
    beginPath() {}
    rect() {}
    ellipse() {}
    clip() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    translate() {}
    rotate() {}
    scale() {}
    strokeRect() {}
    fillText() {}
    measureText() { return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 } }
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4), width: w, height: h }
    }
    putImageData() {}
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4), width: w, height: h }
    }
    stroke() {}
    createLinearGradient() { return { addColorStop() {} } }
  }
  class Canvas {
    constructor() { this.width = 0; this.height = 0 }
    getContext() { return this._ctx || (this._ctx = new Ctx(this)) }
    toDataURL() { return 'data:image/png;base64,AAAA' }
  }
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return new Canvas()
      return { style: {} }
    }
  }
}

mockCanvas()

const doc = new Document(200, 100, '#ffffff')
assert(doc.width === 200 && doc.height === 100, 'doc size')
assert(doc.layers.length === 1, 'background layer')
assert(doc.history.length >= 1, 'history seeded')

const l2 = doc.addLayer('Art')
doc.pushHistory('New Layer')
assert(doc.layers.length === 2, 'addLayer')
assert(doc.currentLayer() === l2, 'active is new layer')

doc.duplicateLayer()
assert(doc.layers.length === 3, 'duplicate')
doc.undo()
assert(doc.layers.length === 2, 'undo duplicate')
doc.redo()
assert(doc.layers.length === 3, 'redo duplicate')

doc.layers[2].x = 10
doc.layers[2].y = 20
doc.alignLayer('left')
assert(doc.currentLayer().x === 0, 'align left')

doc.resize(400, 200)
assert(doc.width === 400 && doc.height === 200, 'image size scales')

doc.canvasSize(500, 300, 'center')
assert(doc.width === 500 && doc.height === 300, 'canvas size')

doc.selection = { x: 10, y: 10, w: 20, h: 20 }
assert(doc.pointInSelection(15, 15) === true, 'point inside')
assert(doc.pointInSelection(1, 1) === false, 'point outside')
doc.selection.inverted = true
assert(doc.pointInSelection(1, 1) === true, 'inverted outside is in')

doc.selection = { x: 0, y: 0, w: 10, h: 10, path: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] }
assert(doc.pointInSelection(5, 5) === true, 'path inside')
assert(doc.pointInSelection(50, 50) === false, 'path outside')

const n = doc.layers.length
doc.deleteLayer()
assert(doc.layers.length === n - 1, 'delete layer')

doc.cropTo(10, 10, 80, 60)
assert(doc.width === 80 && doc.height === 60, 'cropTo size')

const art = doc.addLayer('Spin')
const src = art.canvas
doc.rotateLayerFrom(art, src, { x: 0, y: 0, w: src.width, h: src.height }, Math.PI / 2)
assert(art.canvas.width >= 1 && art.canvas.height >= 1, 'rotateLayerFrom')

doc.flip(true)
assert(doc.width === 80, 'flip keeps canvas size')

const tl = doc.addLayer('Text')
tl.kind = 'text'
tl.text = 'Hello'
doc.pushHistory('Type')
assert(doc.layers[doc.layers.length - 1].kind === 'text', 'text layer on top')
doc.rasterizeText(tl)
assert(tl.kind === 'raster', 'rasterizeText')

const fillLayer = doc.addLayer('FillMe')
doc.selection = { x: 2, y: 2, w: 8, h: 8 }
doc.fillPixels({ color: '#ff0000', opacity: 1, preserve: false })
assert(doc.history.some(h => h.label === 'Fill'), 'fillPixels history')
doc.strokePixels({ color: '#00ff00', size: 2, pos: 'center', record: true })
assert(doc.history.some(h => h.label === 'Stroke'), 'strokePixels history')
fillLayer.fx.stroke = true
fillLayer.fx.strokePos = 'outside'
fillLayer.fx.strokeSize = 2
doc.drawLayerPixels(fillLayer.canvas.getContext('2d'), fillLayer)

const a = doc.addLayer('A')
const b = doc.addLayer('B')
doc.selectLayer(doc.layers.indexOf(a), false)
doc.selectLayer(doc.layers.indexOf(b), true)
assert(doc.selected.size === 2, 'shift multi-select')
const g = doc.groupSelected()
assert(g.kind === 'group', 'group kind')
assert(a.parentId === g.id && b.parentId === g.id, 'children parentId')
assert(doc.layers.filter(l => l.parentId === g.id).length === 2, 'grouped kids')
doc.ungroup(doc.layers.indexOf(g))
assert(!doc.layers.some(l => l.kind === 'group'), 'ungroup removes folder')
assert(!a.parentId && !b.parentId, 'ungroup clears parentId')

const emptyG = doc.groupSelected()
assert(emptyG.kind === 'group', 'empty group folder')
assert(doc.layers.some(l => l.parentId === emptyG.id), 'empty group has inner layer')

doc.selectLayer(0, false)
doc.selectLayer(1, true)
const nBefore = doc.layers.length
doc.deleteLayer()
assert(doc.layers.length < nBefore, 'delete selected')

const snap = doc.snapshot()
assert(snap.layers.every(l => l.canvas), 'snapshot canvases')
doc.restore(snap)
assert(doc.layers.length === snap.layers.length, 'restore layers')

console.log('engine tests passed')
