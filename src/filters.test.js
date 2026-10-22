import {
  levels, curves, hueSaturation, colorBalance, exposure, vibrance, blackWhite,
  photoFilter, gradientMap, desaturate, equalize, autoTone, autoColor,
  gaussianBlur, motionBlurAngle, radialBlur, median, reduceNoise, highPass,
  minimum, maximum, offsetFilter, clouds, sharpenAmount, FILTERS
} from './filters.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

class Ctx {
  constructor(canvas) { this.canvas = canvas }
  getImageData(x, y, w, h) {
    return { data: this.canvas._data.slice(), width: w, height: h }
  }
  putImageData(img) { this.canvas._data.set(img.data.subarray(0, this.canvas._data.length)) }
  createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h } }
  drawImage(src) {
    if (src && src._data) this.canvas._data.set(src._data.subarray(0, this.canvas._data.length))
  }
  clearRect() {}
  fillRect() {}
  save() {}
  restore() {}
  translate() {}
  scale() {}
  rotate() {}
  beginPath() {}
  rect() {}
  ellipse() {}
  clip() {}
  createRadialGradient() { return { addColorStop() {} } }
}

function mockCanvas() {
  class Canvas {
    constructor(w = 0, h = 0) { this.width = w; this.height = h; this._data = new Uint8ClampedArray(w * h * 4) }
    getContext() { return this._ctx || (this._ctx = new Ctx(this)) }
  }
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return new Canvas()
      return { style: {} }
    }
  }
  return Canvas
}

const Canvas = mockCanvas()

function makeCanvas(w = 16, h = 12) {
  const c = new Canvas(w, h)
  for (let i = 0; i < c._data.length; i += 4) {
    c._data[i] = (i * 7) % 256
    c._data[i + 1] = (i * 13) % 256
    c._data[i + 2] = (i * 29) % 256
    c._data[i + 3] = 255
  }
  return c
}

const adjustments = [
  ['levels', (c) => levels(c, { inBlack: 10, inWhite: 240, gamma: 1.2, outBlack: 5, outWhite: 250 })],
  ['curves', (c) => curves(c, { shadows: 20, midtones: -10, highlights: 30 })],
  ['hueSaturation', (c) => hueSaturation(c, { hue: 40, saturation: 20, lightness: -5 })],
  ['colorBalance', (c) => colorBalance(c, { cyanRed: 20, magentaGreen: -10, yellowBlue: 5, preserveLuminosity: true })],
  ['exposure', (c) => exposure(c, { exposure: 30, offset: 4, gamma: 1.1 })],
  ['vibrance', (c) => vibrance(c, { vibrance: 40 })],
  ['blackWhite', (c) => blackWhite(c, { reds: 30, yellows: 10, greens: -20, cyans: 0, blues: 20, magentas: 0 })],
  ['photoFilter', (c) => photoFilter(c, { color: '#ec8a00', density: 30, preserveLuminosity: true })],
  ['gradientMap', (c) => gradientMap(c, { from: '#001122', to: '#ffeecc' })],
  ['desaturate', (c) => desaturate(c)],
  ['equalize', (c) => equalize(c)],
  ['autoTone', (c) => autoTone(c)],
  ['autoColor', (c) => autoColor(c)],
  ['gaussianBlur', (c) => gaussianBlur(c, 4)],
  ['motionBlurAngle', (c) => motionBlurAngle(c, 6, 45)],
  ['radialBlur', (c) => radialBlur(c, 20, 'zoom')],
  ['spinBlur', (c) => radialBlur(c, 20, 'spin')],
  ['median', (c) => median(c, 1)],
  ['reduceNoise', (c) => reduceNoise(c, 6)],
  ['highPass', (c) => highPass(c, 4)],
  ['minimum', (c) => minimum(c, 1)],
  ['maximum', (c) => maximum(c, 1)],
  ['offsetFilter', (c) => offsetFilter(c, 5, 3)],
  ['clouds', (c) => clouds(c, 20)],
  ['sharpenAmount', (c) => sharpenAmount(c, 100)],
  ['posterize', (c) => FILTERS.posterize(c, 4)],
  ['threshold', (c) => FILTERS.threshold(c, 120)],
  ['noise', (c) => FILTERS.noise(c, 20)],
  ['vignette', (c) => FILTERS.vignette(c, 0.5)]
]

for (const [name, fn] of adjustments) {
  const c = makeCanvas()
  fn(c)
  assert(c.width === 16 && c.height === 12, `${name} keeps canvas size`)
  assert(c._data.length === 16 * 12 * 4, `${name} keeps pixel buffer`)
}

const grayscale = makeCanvas()
FILTERS.grayscale(grayscale)
for (let i = 0; i < grayscale._data.length; i += 4) {
  assert(grayscale._data[i] === grayscale._data[i + 1], 'grayscale equalizes channels')
  break
}

console.log('filter tests passed')
