export const TOOL_GROUPS = [
  {
    id: 'move',
    tools: [{ id: 'move', label: 'Move', key: 'V', icon: 'move' }]
  },
  {
    id: 'marquee',
    tools: [
      { id: 'marquee', label: 'Rectangular Marquee', key: 'M', icon: 'marquee' },
      { id: 'ellipse-marquee', label: 'Elliptical Marquee', key: 'M', icon: 'ellipseMarquee' },
      { id: 'row-marquee', label: 'Single Row Marquee', key: 'M', icon: 'rowMarquee' },
      { id: 'col-marquee', label: 'Single Column Marquee', key: 'M', icon: 'colMarquee' }
    ]
  },
  {
    id: 'lasso',
    tools: [
      { id: 'lasso', label: 'Lasso', key: 'L', icon: 'lasso' },
      { id: 'poly-lasso', label: 'Polygonal Lasso', key: 'L', icon: 'polyLasso' },
      { id: 'magnetic-lasso', label: 'Magnetic Lasso', key: 'L', icon: 'magLasso' },
      { id: 'wand', label: 'Magic Wand', key: 'W', icon: 'wand' }
    ]
  },
  {
    id: 'crop',
    tools: [
      { id: 'crop', label: 'Crop', key: 'C', icon: 'crop' },
      { id: 'slice', label: 'Slice', key: 'C', icon: 'slice' }
    ]
  },
  {
    id: 'eyedropper',
    tools: [
      { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: 'eyedropper' },
      { id: 'sampler', label: 'Color Sampler', key: 'I', icon: 'sampler' }
    ]
  },
  {
    id: 'heal',
    tools: [
      { id: 'heal', label: 'Spot Healing Brush', key: 'J', icon: 'heal' },
      { id: 'red-eye', label: 'Red Eye', key: 'J', icon: 'redEye' }
    ]
  },
  {
    id: 'brush',
    tools: [
      { id: 'brush', label: 'Brush', key: 'B', icon: 'brush' },
      { id: 'pencil', label: 'Pencil', key: 'B', icon: 'pencil' }
    ]
  },
  {
    id: 'clone',
    tools: [{ id: 'clone', label: 'Clone Stamp', key: 'S', icon: 'clone' }]
  },
  {
    id: 'history-brush',
    tools: [{ id: 'history-brush', label: 'History Brush', key: 'Y', icon: 'historyBrush' }]
  },
  {
    id: 'eraser',
    tools: [
      { id: 'eraser', label: 'Eraser', key: 'E', icon: 'eraser' },
      { id: 'magic-eraser', label: 'Magic Eraser', key: 'E', icon: 'magicEraser' }
    ]
  },
  {
    id: 'gradient',
    tools: [
      { id: 'gradient', label: 'Gradient', key: 'G', icon: 'gradient' },
      { id: 'fill', label: 'Paint Bucket', key: 'G', icon: 'fill' }
    ]
  },
  {
    id: 'blur',
    tools: [
      { id: 'blur', label: 'Blur', key: 'R', icon: 'blur' },
      { id: 'sharpen', label: 'Sharpen', key: 'R', icon: 'sharpen' },
      { id: 'smudge', label: 'Smudge', key: 'R', icon: 'smudge' }
    ]
  },
  {
    id: 'dodge',
    tools: [
      { id: 'dodge', label: 'Dodge', key: 'O', icon: 'dodge' },
      { id: 'burn', label: 'Burn', key: 'O', icon: 'burn' }
    ]
  },
  {
    id: 'text',
    tools: [{ id: 'text', label: 'Horizontal Type', key: 'T', icon: 'text' }]
  },
  {
    id: 'pen',
    tools: [{ id: 'pen', label: 'Pen', key: 'P', icon: 'pen' }]
  },
  {
    id: 'path',
    tools: [{ id: 'path', label: 'Path Selection', key: 'A', icon: 'path' }]
  },
  {
    id: 'shape',
    tools: [
      { id: 'shape', label: 'Rectangle', key: 'U', icon: 'rect' },
      { id: 'round-rect', label: 'Rounded Rectangle', key: 'U', icon: 'roundRect' },
      { id: 'ellipse', label: 'Ellipse', key: 'U', icon: 'ellipse' },
      { id: 'triangle', label: 'Triangle', key: 'U', icon: 'triangle' },
      { id: 'line', label: 'Line', key: 'U', icon: 'line' },
      { id: 'poly', label: 'Polygon', key: 'U', icon: 'poly' }
    ]
  },
  {
    id: 'hand',
    tools: [{ id: 'hand', label: 'Hand', key: 'H', icon: 'hand' }]
  },
  {
    id: 'zoom',
    tools: [{ id: 'zoom', label: 'Zoom', key: 'Z', icon: 'zoom' }]
  }
]

export const TOOLS = TOOL_GROUPS.flatMap(g => g.tools)

export function toolById(id) {
  return TOOLS.find(t => t.id === id)
}

export function groupForTool(id) {
  return TOOL_GROUPS.find(g => g.tools.some(t => t.id === id))
}

export const ICONS = {
  move: '<svg viewBox="0 0 24 24"><path d="M5 3.2 17.6 13.2h-5.1l3.6 7.6-2.5 1.2-3.6-7.6-4 3.7z"/></svg>',
  marquee: '<svg viewBox="0 0 24 24"><path d="M4 4h3v1.5H4V4zm5 0h3v1.5H9V4zm5 0h3v1.5h-3V4zm5 0h1v3h-1.5V4H19zM4 9h1.5v3H4V9zm14.5 0H20v3h-1.5V9zM4 14h1.5v3H4v-3zm14.5 0H20v3h-1.5v-3zM4 19v1h3v-1.5H4V19zm5 0v1h3v-1.5H9V19zm5 0v1h3v-1.5h-3V19zm5 .5V20h1v-3h-1.5v2.5H19z"/></svg>',
  ellipseMarquee: '<svg viewBox="0 0 24 24"><path d="M12 4c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm0 1.5C8.4 5.5 5.5 8.4 5.5 12S8.4 18.5 12 18.5 18.5 15.6 18.5 12 15.6 5.5 12 5.5z" fill-rule="evenodd"/></svg>',
  rowMarquee: '<svg viewBox="0 0 24 24"><path d="M3 10.5h18v3H3z"/><path d="M3 8h2v1.5H3V8zm4 0h3v1.5H7V8zm5 0h3v1.5h-3V8zm5 0h3v1.5h-3V8zM3 14.5h2V16H3v-1.5zm4 0h3V16H7v-1.5zm5 0h3V16h-3v-1.5zm5 0h3V16h-3v-1.5z" opacity=".7"/></svg>',
  colMarquee: '<svg viewBox="0 0 24 24"><path d="M10.5 3h3v18h-3z"/><path d="M8 3h1.5v2H8V3zm0 4h1.5v3H8V7zm0 5h1.5v3H8v-3zm0 5h1.5v3H8v-3zM14.5 3H16v2h-1.5V3zm0 4H16v3h-1.5V7zm0 5H16v3h-1.5v-3zm0 5H16v3h-1.5v-3z" opacity=".7"/></svg>',
  lasso: '<svg viewBox="0 0 24 24"><path d="M14 4c3.3 0 6 2.2 6 5.2S17.3 14.5 14 14.5c-.7 0-1.4-.1-2-.3-.5 1.5-1.9 2.6-3.6 2.6-2.1 0-3.8-1.6-3.8-3.6 0-1.1.5-2.1 1.4-2.7C5.4 9.7 5 8.6 5 7.5 5 5.5 7.5 4 11 4h3zm-1.2 9.2c.4.1.8.1 1.2.1 2.4 0 4.3-1.6 4.3-3.7S16.4 5.7 14 5.7h-3c-2.4 0-4.3 1-4.3 2.3 0 .8.5 1.5 1.4 1.9l.7.3-.4.6c-.5.8-.8 1.6-.8 2.4 0 1.1.9 2 2.1 2 1.1 0 2-.7 2.4-1.7l.3-.8.6.2z"/></svg>',
  polyLasso: '<svg viewBox="0 0 24 24"><path d="M5 4l7 3 7-2v6l-4 8H8L5 12V4zm2 2.2v5.3l2.4 6.5h5.3L18 11.4V6.6l-5.2 1.5L7 6.2z"/></svg>',
  magLasso: '<svg viewBox="0 0 24 24"><path d="M14 4c3.3 0 6 2.2 6 5.2S17.3 14.5 14 14.5c-.7 0-1.4-.1-2-.3-.5 1.5-1.9 2.6-3.6 2.6-2.1 0-3.8-1.6-3.8-3.6 0-1.1.5-2.1 1.4-2.7C5.4 9.7 5 8.6 5 7.5 5 5.5 7.5 4 11 4h3z"/><path d="M4 16.5 7.2 19.7 6 21l-3.2-3.2 1.2-1.3zm2.4 0 1.2 1.2 8.2-8.2-1.2-1.2-8.2 8.2z"/></svg>',
  crop: '<svg viewBox="0 0 24 24"><path d="M7 2v4H3v2h4v10h10v4h2v-4h4v-2H9V4H7zm4 8h8v8h-8v-8z"/></svg>',
  slice: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm1.6 1.6v12.8h12.8V5.6H5.6zM11.2 5.6h1.6v12.8h-1.6zM5.6 11.2h12.8v1.6H5.6z"/></svg>',
  eyedropper: '<svg viewBox="0 0 24 24"><path d="M19.6 4.4a2.8 2.8 0 0 0-4 0l-1.5 1.5 1.8 1.8 1.5-1.5a.8.8 0 1 1 1.1 1.1l-8.9 8.9H6.3v-3.3l8.9-8.9 1.1 1.1-1.5 1.5 1.8 1.8 1.5-1.5a2.8 2.8 0 0 0 0-4z"/></svg>',
  sampler: '<svg viewBox="0 0 24 24"><path d="M18.8 4.2a2.2 2.2 0 0 0-3.1 0L14.4 5.5l2.1 2.1 1.3-1.3a.7.7 0 1 1 1 1L10 16.1H6v-4L14.8 3.3l1 1-1.3 1.3 2.1 2.1 1.3-1.3a2.2 2.2 0 0 0 0-3.1z"/><circle cx="7.2" cy="18.4" r="2.2"/></svg>',
  wand: '<svg viewBox="0 0 24 24"><path d="M7.5 15.5 15 8l1.4 1.4-7.5 7.5H6.2v-1.4zm10.2-12 .7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6zM4 5l.5 1.2L5.7 7 4.5 7.5 4 8.7l-.5-1.2L2.3 7l1.2-.8L4 5zm14 10 .5 1.2 1.2.8-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.8.5-1.2z"/></svg>',
  redEye: '<svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 2c-4.1 0-6.9 3.3-6.9 5S7.9 17 12 17s6.9-3.3 6.9-5S16.1 7 12 7zm0 1.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z" fill="#e24b4b"/></svg>',
  heal: '<svg viewBox="0 0 24 24"><path d="M13.5 3.2 20.8 10.5 11 20.3H3.7v-7.3L13.5 3.2zm1.4 2.8L6.2 14.7v3.1h3.1l8.7-8.7-2.1-2.1zM8 4l.6 1.5L10 6.2 8.6 6.8 8 8.3l-.6-1.5L6 6.2l1.4-.7L8 4z"/></svg>',
  brush: '<svg viewBox="0 0 24 24"><path d="M6.8 16.3c-1.8 1.8-3.3 4.2-3.3 4.2s2.4-1.5 4.2-3.3a2.2 2.2 0 1 0-1-1zM18.9 3.2a2.1 2.1 0 0 0-3 0L8.2 11l4.8 4.8 7.7-7.7a2.1 2.1 0 0 0 0-3l-1.8-1.9z"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 17.2 14.8 6.4l2.8 2.8L6.8 20H4v-2.8zM16.2 5l1.6-1.6a1.2 1.2 0 0 1 1.7 0l1.1 1.1a1.2 1.2 0 0 1 0 1.7L18.9 7.8 16.2 5z"/></svg>',
  clone: '<svg viewBox="0 0 24 24"><path d="M9 8h11v11H9V8zM4 13h3v8h8v3H4V13z"/></svg>',
  historyBrush: '<svg viewBox="0 0 24 24"><path d="M7.2 16.4c-1.8 1.8-3.4 4.1-3.4 4.1s2.3-1.6 4.1-3.4a2.1 2.1 0 1 0-.7-.7zM18.6 3.4a2 2 0 0 0-2.8 0L8.6 10.6l4.8 4.8 7.2-7.2a2 2 0 0 0 0-2.8l-2-2z"/><path d="M4.2 8.2c1.8-3.4 5.2-5 8.4-4.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M16.4 3.6 20.4 7.6a2 2 0 0 1 0 2.8l-8.5 8.5H6.2L3 16.7a2 2 0 0 1 0-2.8L13.6 3.6a2 2 0 0 1 2.8 0zM5 20.2h14v1.6H5z"/></svg>',
  magicEraser: '<svg viewBox="0 0 24 24"><path d="M15.6 4.2 19.4 8a1.6 1.6 0 0 1 0 2.3l-7.4 7.4H7.2L4 14.9a1.6 1.6 0 0 1 0-2.3l8.8-8.4a1.6 1.6 0 0 1 2.8 0zM5 20h14v1.6H5zM19 3.2l.5 1.1 1.1.5-1.1.5L19 6.4l-.5-1.1-1.1-.5 1.1-.5L19 3.2z"/></svg>',
  fill: '<svg viewBox="0 0 24 24"><path d="M16.5 8.4 9.2 1.2 7.8 2.6l2.4 2.4L4.2 11a2 2 0 0 0 0 2.8l5.8 5.8a2 2 0 0 0 2.8 0L19.2 13l.5.5 1.4-1.4-4.6-4.7zM18.7 17.6c0 1.5-1.8 2.7-1.8 2.7s-1.8-1.2-1.8-2.7a1.8 1.8 0 1 1 3.6 0z"/></svg>',
  gradient: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4V6zm1.6 1.5v9h1.6v-9H5.6zm3.1 0v9h1.6v-9H8.7zm3.1 0v9h2.2v-9h-2.2zm3.8 0v9h1.8v-9h-1.8zm3.3 0v9H18v-9h-1.1z"/></svg>',
  blur: '<svg viewBox="0 0 24 24"><path d="M12 3.2c4 3.7 6.5 6.9 6.5 10.3a6.5 6.5 0 0 1-13 0c0-3.4 2.5-6.6 6.5-10.3z"/></svg>',
  sharpen: '<svg viewBox="0 0 24 24"><path d="M12 3l7 17H5L12 3zm0 4.6L8.1 17.2h7.8L12 7.6z"/></svg>',
  smudge: '<svg viewBox="0 0 24 24"><path d="M14 3.5c.8 0 1.5.7 1.5 1.5V11h.5V6.2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5V14c0 3.6-2.9 6.5-6.5 6.5h-.8A6.2 6.2 0 0 1 6 14.3V10c0-.8.7-1.5 1.5-1.5S9 9.2 9 10v1h.5V5c0-.8.7-1.5 1.5-1.5S12.5 4.2 12.5 5v6H13V5c0-.8.7-1.5 1.5-1.5z"/></svg>',
  dodge: '<svg viewBox="0 0 24 24"><path d="M12 3.5 13.4 8 18 9.4 13.4 10.8 12 15.3 10.6 10.8 6 9.4 10.6 8 12 3.5zm7 10.2.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4z"/></svg>',
  burn: '<svg viewBox="0 0 24 24"><path d="M12 3c2.8 3.2 5 6.2 5 9.2A5 5 0 1 1 7 12.2C7 9.2 9.2 6.2 12 3zm0 6.2c-1.4 1.6-2.2 3-2.2 4.2a2.2 2.2 0 1 0 4.4 0c0-1.2-.8-2.6-2.2-4.2z"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M5 5h14v3h-2.1V7.2h-3.7V17h1.8v2H8.9v-2h1.8V7.2H7.1V8H5V5z"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M14.7 3.8 20.2 9.3 9.4 20.1H4v-5.4L14.7 3.8zm1.4 2.6-1.2 1.2 2.5 2.5 1.2-1.2-2.5-2.5z"/></svg>',
  path: '<svg viewBox="0 0 24 24"><path d="M13 4h7v7h-2V7.4l-7.3 7.3 1.6 1.6L20 9.4V20h-7v-2h5V9.4l-6.2 6.2-4.1-4.1L13 6.2V11h2V4h-2zM4 4h7v2H6v12h5v2H4V4z"/></svg>',
  rect: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4V6zm2 2v8h12V8H6z"/></svg>',
  ellipse: '<svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 3.1 9 7s-4 7-9 7-9-3.1-9-7 4-7 9-7zm0 2c-3.8 0-7 2.2-7 5s3.2 5 7 5 7-2.2 7-5-3.2-5-7-5z"/></svg>',
  roundRect: '<svg viewBox="0 0 24 24"><path d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7z"/></svg>',
  triangle: '<svg viewBox="0 0 24 24"><path d="M12 4 21 20H3L12 4zm0 3.7L5.9 18h12.2L12 7.7z"/></svg>',
  line: '<svg viewBox="0 0 24 24"><path d="M19.2 4.1 20 4.9 5.1 19.8l-.8-.8L19.2 4.1z"/></svg>',
  poly: '<svg viewBox="0 0 24 24"><path d="M12 3.2 20 9l-3.1 9.6H7.1L4 9 12 3.2zm0 2.6L6.6 9.6 8.8 16.4h6.4l2.2-6.8L12 5.8z"/></svg>',
  shape: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4V6zm2 2v8h12V8H6z"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M11.2 2.2c.8 0 1.4.6 1.4 1.4V11h.5V5.4c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4V11h.5V7.6c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4V16c0 3.3-2.7 6-6 6h-1.1A6.7 6.7 0 0 1 5.4 15.3V9.6c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4V11h.5V3.6c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4V11h.5V3.6c0-.8.6-1.4 1.4-1.4z"/></svg>',
  zoom: '<svg viewBox="0 0 24 24"><path d="M15.2 13.6h-.7l-.2-.2A6 6 0 1 0 13.4 15l.2.2v.7l4.8 4.8 1.5-1.5-4.7-4.6zM10 14.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4z"/></svg>'
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(v, a = 0, b = 255) {
  return v < a ? a : v > b ? b : v
}

export function createToolController(app) {
  const state = {
    drawing: false,
    start: null,
    last: null,
    points: [],
    cloneSrc: null,
    alt: false,
    shape: 'rect',
    brushSize: 18,
    hardness: 80,
    opacity: 100,
    flow: 100,
    fillOn: true,
    strokeOn: true,
    fontSize: 48,
    fontFamily: 'Arial',
    textBold: false,
    textItalic: false,
    gradientType: 'linear',
    wandTol: 32,
    autoSelect: true,
    showTransform: true,
    showDistances: false,
    cropRect: null,
    feather: 0,
    shift: false,
    selMode: 'new',
    xfHandle: null,
    xfStartBox: null,
    xfOrigCanvas: null,
    xfStartAngle: 0,
    cropHandle: null,
    cropStart: null,
    selXf: false,
    selHandle: null,
    selStartBox: null
  }

  function docPt(e) {
    return app.screenToDoc(e.clientX, e.clientY)
  }

  function xfBox() {
    const layer = app.doc.currentLayer()
    return layer ? app.doc.layerBox(layer) : null
  }

  function rotHandlePt(b) {
    if (!b) return null
    return { x: b.x + b.w / 2, y: b.y - 22 / Math.max(0.25, app.doc.zoom) }
  }

  function boxHandles(b) {
    return {
      nw: { x: b.x, y: b.y },
      n: { x: b.x + b.w / 2, y: b.y },
      ne: { x: b.x + b.w, y: b.y },
      e: { x: b.x + b.w, y: b.y + b.h / 2 },
      se: { x: b.x + b.w, y: b.y + b.h },
      s: { x: b.x + b.w / 2, y: b.y + b.h },
      sw: { x: b.x, y: b.y + b.h },
      w: { x: b.x, y: b.y + b.h / 2 }
    }
  }

  function hitHandleOn(b, p, extra) {
    if (!b) return null
    const hs = 8 / Math.max(0.2, app.doc.zoom)
    const pts = extra ? { ...boxHandles(b), ...extra } : boxHandles(b)
    for (const [id, q] of Object.entries(pts)) {
      if (Math.abs(p.x - q.x) <= hs && Math.abs(p.y - q.y) <= hs) return id
    }
    return null
  }

  function hitXfHandle(p) {
    if (!state.showTransform) return null
    const b = xfBox()
    if (!b) return null
    const rot = rotHandlePt(b)
    return hitHandleOn(b, p, rot ? { rot } : null)
  }

  function hitCropHandle(p) {
    const c = state.cropRect
    if (!c) return null
    const h = hitHandleOn(c, p)
    if (h) return h
    if (p.x >= c.x && p.y >= c.y && p.x <= c.x + c.w && p.y <= c.y + c.h) return 'move'
    return null
  }

  function selBox() {
    const s = app.doc.selection
    if (!s || s.path) return null
    return { x: s.x, y: s.y, w: s.w, h: s.h, ellipse: !!s.ellipse, inverted: !!s.inverted }
  }

  function hitSelHandle(p) {
    const b = selBox()
    if (!b) return null
    const h = hitHandleOn(b, p)
    if (h) return h
    if (state.selXf && p.x >= b.x && p.y >= b.y && p.x <= b.x + b.w && p.y <= b.y + b.h) return 'move'
    return null
  }

  function applySelBox(next) {
    const s = app.doc.selection
    if (!s) return
    app.doc.selection = {
      ...s,
      x: next.x,
      y: next.y,
      w: next.w,
      h: next.h,
      path: null
    }
  }

  const XF_CURSOR = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
    se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    rot: 'grab', move: 'move'
  }

  function applyBoxResize(b, h, p, fromCenter, keep) {
    let x = b.x, y = b.y, w = b.w, ht = b.h
    const ratio = b.w / b.h
    if (h.includes('w')) {
      const nx = fromCenter ? b.x + b.w / 2 - (p.x < b.x + b.w / 2 ? b.x + b.w - p.x : p.x - b.x) : p.x
      w = b.x + b.w - nx
      x = nx
    }
    if (h.includes('e')) w = p.x - (fromCenter ? b.x + b.w / 2 - (p.x - (b.x + b.w / 2)) : b.x)
    if (h.includes('n')) {
      const ny = fromCenter ? b.y + b.h / 2 - Math.abs(p.y - (b.y + b.h / 2)) : p.y
      ht = b.y + b.h - ny
      y = ny
    }
    if (h.includes('s')) ht = p.y - (fromCenter ? b.y + b.h / 2 - Math.abs(p.y - (b.y + b.h / 2)) : b.y)
    if (keep && ratio) {
      if (h === 'n' || h === 's') { w = ht * ratio; x = b.x + (b.w - w) / 2 }
      else if (h === 'e' || h === 'w') { ht = w / ratio; y = b.y + (b.h - ht) / 2 }
      else {
        const s = Math.max(Math.abs(w), Math.abs(ht * ratio)) / b.w
        w = b.w * (w < 0 ? -s : s)
        ht = b.h * (ht < 0 ? -s : s)
        if (h.includes('w')) x = b.x + b.w - w
        if (h.includes('n')) y = b.y + b.h - ht
      }
    }
    if (fromCenter && (h === 'n' || h === 's' || h === 'e' || h === 'w' || h.length === 2)) {
      x = b.x + b.w / 2 - Math.abs(w) / 2
      y = b.y + b.h / 2 - Math.abs(ht) / 2
    }
    if (w < 0) { x += w; w = -w }
    if (ht < 0) { y += ht; ht = -ht }
    return { x, y, w: Math.max(2, w), h: Math.max(2, ht) }
  }

  function constrainRect(a, b, shift) {
    if (!shift) return b
    const s = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    return {
      x: a.x + Math.sign(b.x - a.x || 1) * s,
      y: a.y + Math.sign(b.y - a.y || 1) * s
    }
  }

  function rectFromPoints(a, b, shift, fromCenter) {
    const end = constrainRect(a, b, shift)
    let x1 = a.x, y1 = a.y, x2 = end.x, y2 = end.y
    if (fromCenter) {
      const dx = x2 - x1
      const dy = y2 - y1
      x1 = a.x - dx
      y1 = a.y - dy
      x2 = a.x + dx
      y2 = a.y + dy
    }
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    return { x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), end }
  }

  function layerPt(p, layer) {
    if (!layer) return p
    return { x: p.x - layer.x, y: p.y - layer.y }
  }

  function constrainLine(a, b, shift) {
    if (!shift) return b
    const dx = b.x - a.x
    const dy = b.y - a.y
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
    const d = Math.hypot(dx, dy)
    return { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d }
  }

  function mergeSelection(next) {
    const mode = state.selMode
    if (!next) {
      if (mode === 'new') app.doc.selection = null
      return
    }
    const cur = app.doc.selection
    if ((mode === 'add' || mode === 'intersect') && cur) {
      const x = Math.min(cur.x, next.x)
      const y = Math.min(cur.y, next.y)
      const w = Math.max(cur.x + cur.w, next.x + next.w) - x
      const h = Math.max(cur.y + cur.h, next.y + next.h) - y
      if (mode === 'intersect') {
        const ix = Math.max(cur.x, next.x)
        const iy = Math.max(cur.y, next.y)
        const iw = Math.min(cur.x + cur.w, next.x + next.w) - ix
        const ih = Math.min(cur.y + cur.h, next.y + next.h) - iy
        app.doc.selection = iw > 0 && ih > 0
          ? { x: ix, y: iy, w: iw, h: ih, ellipse: cur.ellipse && next.ellipse }
          : null
        return
      }
      app.doc.selection = {
        x, y, w, h,
        ellipse: cur.ellipse && next.ellipse,
        path: next.path || cur.path || null
      }
      return
    }
    if (mode === 'subtract' && cur) {
      app.doc.selection = { ...cur, inverted: !cur.inverted }
      return
    }
    app.doc.selection = next
  }

  function layerCtx() {
    const layer = app.doc.currentLayer()
    if (!layer) return { layer: null, ctx: null }
    if (layer.kind === 'group') return { layer, ctx: null }
    return { layer, ctx: layer.canvas.getContext('2d') }
  }

  function stampBrush(ctx, x, y, erase = false, hard = false, layer = null) {
    if (layer && !app.doc.pointInSelection(x + layer.x, y + layer.y)) return
    const size = state.brushSize
    ctx.save()
    if (layer) app.doc.clipToSelection(ctx, layer.x, layer.y)
    else app.doc.clipToSelection(ctx)
    ctx.globalAlpha = (state.opacity / 100) * (state.flow / 100)
    ctx.globalCompositeOperation = erase ? 'destination-out' : (layer?.lockTrans ? 'source-atop' : 'source-over')
    if (hard) {
      const rgb = hexToRgb(app.doc.fg)
      ctx.fillStyle = erase ? '#000' : `rgb(${rgb.r},${rgb.g},${rgb.b})`
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const inner = (state.hardness / 100) * size
      if (erase) {
        const g = ctx.createRadialGradient(x, y, inner * 0.15, x, y, size / 2)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(Math.min(0.92, state.hardness / 100), 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
      } else {
        const rgb = hexToRgb(app.doc.fg)
        const g = ctx.createRadialGradient(x, y, inner * 0.15, x, y, size / 2)
        g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`)
        g.addColorStop(Math.min(0.92, state.hardness / 100), `rgba(${rgb.r},${rgb.g},${rgb.b},1)`)
        g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
        ctx.fillStyle = g
      }
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function strokeBrush(ctx, a, b, erase = false, hard = false, layer = null) {
    const gap = Math.max(1, state.brushSize * (hard ? 0.45 : 0.28))
    const n = Math.max(1, Math.ceil(dist(a, b) / gap))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      stampBrush(ctx, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, erase, hard, layer)
    }
  }

  function floodFill(canvas, x, y, fillHex, clear = false, tol = 32, layer = null) {
    x = Math.floor(x); y = Math.floor(y)
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    if (x < 0 || y < 0 || x >= w || y >= h) return
    if (layer && !app.doc.pointInSelection(x + layer.x, y + layer.y)) return
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    const i0 = (y * w + x) * 4
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3]
    const fill = fillHex ? hexToRgb(fillHex) : { r: 0, g: 0, b: 0 }
    if (!clear && Math.abs(tr - fill.r) + Math.abs(tg - fill.g) + Math.abs(tb - fill.b) < 2 && ta > 250) return
    const match = (i) => Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol
    const stack = [x, y]
    const seen = new Uint8Array(w * h)
    while (stack.length) {
      const cy = stack.pop()
      const cx = stack.pop()
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue
      const p = cy * w + cx
      if (seen[p]) continue
      let i = p * 4
      if (!match(i)) continue
      let lx = cx
      while (lx >= 0 && match(((cy * w + lx) * 4)) && !seen[cy * w + lx]) lx--
      lx++
      let rx = cx
      while (rx < w && match(((cy * w + rx) * 4)) && !seen[cy * w + rx]) rx++
      let spanUp = false, spanDown = false
      for (let xx = lx; xx < rx; xx++) {
        const pi = cy * w + xx
        if (layer && !app.doc.pointInSelection(xx + layer.x, cy + layer.y)) {
          seen[pi] = 1
          continue
        }
        seen[pi] = 1
        i = pi * 4
        if (clear) {
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0
        } else {
          d[i] = fill.r; d[i + 1] = fill.g; d[i + 2] = fill.b; d[i + 3] = 255
        }
        if (cy > 0) {
          const up = match((((cy - 1) * w + xx) * 4))
          if (up && !spanUp) { stack.push(xx, cy - 1); spanUp = true }
          else if (!up) spanUp = false
        }
        if (cy < h - 1) {
          const dn = match((((cy + 1) * w + xx) * 4))
          if (dn && !spanDown) { stack.push(xx, cy + 1); spanDown = true }
          else if (!dn) spanDown = false
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  function wandSelect(canvas, x, y, ox = 0, oy = 0) {
    x = Math.floor(x); y = Math.floor(y)
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    const i0 = (y * w + x) * 4
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3]
    const tol = state.wandTol
    const match = (i) => Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol
    const stack = [x, y]
    const seen = new Uint8Array(w * h)
    let minX = w, minY = h, maxX = 0, maxY = 0
    while (stack.length) {
      const cy = stack.pop()
      const cx = stack.pop()
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue
      const p = cy * w + cx
      if (seen[p]) continue
      if (!match(p * 4)) continue
      let lx = cx
      while (lx >= 0 && match((cy * w + lx) * 4) && !seen[cy * w + lx]) lx--
      lx++
      let rx = cx
      while (rx < w && match((cy * w + rx) * 4) && !seen[cy * w + rx]) rx++
      let spanUp = false, spanDown = false
      for (let xx = lx; xx < rx; xx++) {
        const pi = cy * w + xx
        seen[pi] = 1
        if (xx < minX) minX = xx
        if (cy < minY) minY = cy
        if (xx > maxX) maxX = xx
        if (cy > maxY) maxY = cy
        if (cy > 0) {
          const up = match(((cy - 1) * w + xx) * 4)
          if (up && !spanUp) { stack.push(xx, cy - 1); spanUp = true }
          else if (!up) spanUp = false
        }
        if (cy < h - 1) {
          const dn = match(((cy + 1) * w + xx) * 4)
          if (dn && !spanDown) { stack.push(xx, cy + 1); spanDown = true }
          else if (!dn) spanDown = false
        }
      }
    }
    if (maxX < minX) return
    mergeSelection({ x: minX + ox, y: minY + oy, w: maxX - minX + 1, h: maxY - minY + 1 })
  }

  function sample(x, y) {
    const c = document.createElement('canvas')
    c.width = app.doc.width
    c.height = app.doc.height
    app.doc.compositeTo(c.getContext('2d'))
    const px = Math.max(0, Math.min(c.width - 1, Math.floor(x)))
    const py = Math.max(0, Math.min(c.height - 1, Math.floor(y)))
    const p = c.getContext('2d').getImageData(px, py, 1, 1).data
    return '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  function currentShapeKind() {
    const t = app.tool
    if (t === 'ellipse') return 'ellipse'
    if (t === 'line') return 'line'
    if (t === 'poly') return 'poly'
    if (t === 'round-rect') return 'round-rect'
    if (t === 'triangle') return 'triangle'
    return state.shape
  }

  function drawShape(ctx, a, b, preview = false) {
    const x = Math.min(a.x, b.x)
    const y = Math.min(a.y, b.y)
    const w = Math.abs(b.x - a.x)
    const h = Math.abs(b.y - a.y)
    ctx.save()
    if (!preview) {
      const layer = app.doc.currentLayer()
      app.doc.clipToSelection(ctx, layer?.x || 0, layer?.y || 0)
    }
    ctx.lineWidth = Math.max(1, state.brushSize / 4)
    ctx.strokeStyle = app.doc.fg
    ctx.fillStyle = app.doc.fg
    ctx.globalAlpha = state.opacity / 100
    const kind = currentShapeKind()
    ctx.beginPath()
    if (kind === 'rect') ctx.rect(x, y, w, h)
    else if (kind === 'round-rect') {
      const r = Math.min(w, h) * 0.18
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
      else ctx.rect(x, y, w, h)
    }
    else if (kind === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2)
    else if (kind === 'line') {
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
    } else if (kind === 'triangle') {
      ctx.moveTo(x + w / 2, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
    } else if (kind === 'poly') {
      const n = 5
      const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + i * Math.PI * 2 / n
        const px = cx + Math.cos(ang) * rx
        const py = cy + Math.sin(ang) * ry
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
      }
      ctx.closePath()
    }
    if (kind !== 'line' && state.fillOn) ctx.fill()
    if (state.strokeOn || kind === 'line') ctx.stroke()
    ctx.restore()
  }

  function drawGradient(ctx, a, b) {
    ctx.save()
    const layer = app.doc.currentLayer()
    app.doc.clipToSelection(ctx, layer?.x || 0, layer?.y || 0)
    const rgbA = hexToRgb(app.doc.fg)
    const rgbB = hexToRgb(app.doc.bg)
    let g
    if (state.gradientType === 'radial') {
      const r = dist(a, b)
      g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(1, r))
    } else {
      g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    }
    g.addColorStop(0, `rgba(${rgbA.r},${rgbA.g},${rgbA.b},1)`)
    g.addColorStop(1, `rgba(${rgbB.r},${rgbB.g},${rgbB.b},1)`)
    ctx.fillStyle = g
    ctx.globalAlpha = state.opacity / 100
    const cw = ctx.canvas?.width || layer?.canvas?.width || 0
    const ch = ctx.canvas?.height || layer?.canvas?.height || 0
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()
  }

  function toneAt(ctx, x, y, mode) {
    const size = Math.max(4, Math.round(state.brushSize))
    const sx = Math.max(0, Math.round(x - size / 2))
    const sy = Math.max(0, Math.round(y - size / 2))
    const sw = Math.min(size, ctx.canvas.width - sx)
    const sh = Math.min(size, ctx.canvas.height - sy)
    if (sw <= 0 || sh <= 0) return
    const img = ctx.getImageData(sx, sy, sw, sh)
    const d = img.data
    const cx = x - sx
    const cy = y - sy
    const r2 = (size / 2) * (size / 2)
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const dx = px - cx
        const dy = py - cy
        if (dx * dx + dy * dy > r2) continue
        const i = (py * sw + px) * 4
        if (mode === 'dodge') {
          d[i] = clamp(d[i] + 10)
          d[i + 1] = clamp(d[i + 1] + 10)
          d[i + 2] = clamp(d[i + 2] + 10)
        } else if (mode === 'burn') {
          d[i] = clamp(d[i] - 10)
          d[i + 1] = clamp(d[i + 1] - 10)
          d[i + 2] = clamp(d[i + 2] - 10)
        } else if (mode === 'red-eye') {
          const maxc = Math.max(d[i], d[i + 1], d[i + 2])
          if (d[i] > d[i + 1] * 1.25 && d[i] > d[i + 2] * 1.25 && maxc > 40) {
            const avg = (d[i + 1] + d[i + 2]) / 2
            d[i] = avg
          }
        } else if (mode === 'blur' || mode === 'heal' || mode === 'sharpen') {
          let r = 0, g = 0, b = 0, n = 0
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const nx = px + ox, ny = py + oy
              if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue
              const j = (ny * sw + nx) * 4
              r += d[j]; g += d[j + 1]; b += d[j + 2]; n++
            }
          }
          if (!n) continue
          const ar = r / n, ag = g / n, ab = b / n
          if (mode === 'sharpen') {
            d[i] = clamp(d[i] * 1.6 - ar * 0.6)
            d[i + 1] = clamp(d[i + 1] * 1.6 - ag * 0.6)
            d[i + 2] = clamp(d[i + 2] * 1.6 - ab * 0.6)
          } else {
            const mix = mode === 'heal' ? 0.65 : 0.45
            d[i] = d[i] * (1 - mix) + ar * mix
            d[i + 1] = d[i + 1] * (1 - mix) + ag * mix
            d[i + 2] = d[i + 2] * (1 - mix) + ab * mix
          }
        }
      }
    }
    ctx.putImageData(img, sx, sy)
  }

  function smudgeAt(ctx, from, to) {
    const size = Math.max(6, Math.round(state.brushSize))
    const sx = Math.max(0, Math.round(from.x - size / 2))
    const sy = Math.max(0, Math.round(from.y - size / 2))
    const dx = Math.max(0, Math.round(to.x - size / 2))
    const dy = Math.max(0, Math.round(to.y - size / 2))
    ctx.save()
    ctx.globalAlpha = 0.35 * (state.opacity / 100)
    ctx.beginPath()
    ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(ctx.canvas, sx, sy, size, size, dx, dy, size, size)
    ctx.restore()
  }

  function cloneStamp(ctx, x, y) {
    if (!state.cloneSrc) return
    const layer = app.doc.currentLayer()
    const size = state.brushSize
    const docX = x + (layer?.x || 0)
    const docY = y + (layer?.y || 0)
    const dx = docX - state.start.x
    const dy = docY - state.start.y
    const sx = state.cloneSrc.x + dx - (layer?.x || 0)
    const sy = state.cloneSrc.y + dy - (layer?.y || 0)
    ctx.save()
    if (layer) app.doc.clipToSelection(ctx, layer.x, layer.y)
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = state.opacity / 100
    ctx.drawImage(layer.canvas, sx - size / 2, sy - size / 2, size, size, x - size / 2, y - size / 2, size, size)
    ctx.restore()
  }

  function historyStamp(ctx, x, y, layer) {
    const snap = app.doc.history[0]?.snap
    if (!snap || !layer) return
    const src = snap.layers.find(l => l.id === layer.id) || snap.layers[app.doc.active]
    if (!src?.canvas) return
    const size = Math.max(2, state.brushSize)
    ctx.save()
    if (layer) app.doc.clipToSelection(ctx, layer.x, layer.y)
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = state.opacity / 100
    ctx.drawImage(src.canvas, 0, 0)
    ctx.restore()
  }

  const paintTools = ['brush', 'pencil', 'eraser', 'history-brush']
  const toneTools = ['blur', 'sharpen', 'dodge', 'burn', 'heal', 'red-eye']
  const shapeTools = ['shape', 'round-rect', 'ellipse', 'triangle', 'line', 'poly']
  const selectTools = ['marquee', 'ellipse-marquee', 'lasso', 'poly-lasso', 'magnetic-lasso', 'crop', 'slice']

  return {
    state,
    down(e) {
      const p = docPt(e)
      const tool = app.tool
      state.drawing = true
      state.start = p
      state.last = p
      state.points = [p]
      state.alt = e.altKey
      state.shift = e.shiftKey
      state.selMode = e.shiftKey && e.altKey ? 'intersect' : e.shiftKey ? 'add' : e.altKey ? 'subtract' : 'new'
      const { layer, ctx } = layerCtx()

      if ((tool === 'crop' || tool === 'slice') && state.cropRect) {
        const ch = hitCropHandle(p)
        if (ch) {
          state.cropHandle = ch
          state.cropStart = { ...state.cropRect }
          state.last = p
          return
        }
      }
      if ((tool === 'marquee' || tool === 'ellipse-marquee') && app.doc.selection && !app.doc.selection.path) {
        const sh = hitSelHandle(p)
        if (sh) {
          state.selHandle = sh
          state.selStartBox = { ...selBox() }
          state.selXf = true
          state.last = p
          return
        }
      }
      if (tool === 'move' || tool === 'path') {
        const handle = hitXfHandle(p)
        if (handle) {
          const layer = app.doc.currentLayer()
          if (layer?.lockPos || layer?.locked) {
            app.toast('Layer is locked')
            state.drawing = false
            return
          }
          state.xfHandle = handle
          state.xfStartBox = { ...app.doc.layerBox(layer) }
          state.xfOrigCanvas = layer.canvas
          if (handle === 'rot') {
            const b = state.xfStartBox
            state.xfStartAngle = Math.atan2(p.y - (b.y + b.h / 2), p.x - (b.x + b.w / 2))
          }
          return
        }
        if (state.autoSelect) {
          const hit = app.doc.hitLayerAt(p.x, p.y, { skipLockPos: true })
          if (hit >= 0 && hit !== app.doc.active) {
            app.doc.selectLayer(hit, e.shiftKey)
            app.render()
          }
        }
        const cur = app.doc.currentLayer()
        if (e.altKey && cur && !cur.lockPos && !cur.locked) app.doc.duplicateLayer()
        if (app.doc.currentLayer()?.lockPos || app.doc.currentLayer()?.locked) {
          if (app.doc.currentLayer()?.locked) app.toast('Layer is locked')
          state.drawing = false
        }
        return
      }
      if (tool === 'hand') return
      if (tool === 'zoom') {
        app.setZoom(app.doc.zoom * (e.altKey ? 0.8 : 1.25), p)
        state.drawing = false
        return
      }
      if (tool === 'eyedropper' || tool === 'sampler' || (e.altKey && (paintTools.includes(tool) || tool === 'fill'))) {
        const hex = sample(p.x, p.y)
        if ((tool === 'eyedropper' || tool === 'sampler') && e.shiftKey) app.setBg(hex)
        else app.setFg(hex)
        if (tool === 'sampler') app.toast(`${hex}  ${Math.round(p.x)}, ${Math.round(p.y)}`)
        state.drawing = false
        return
      }
      if (tool === 'row-marquee') {
        const y = Math.max(0, Math.min(app.doc.height - 1, Math.floor(p.y)))
        mergeSelection({ x: 0, y, w: app.doc.width, h: 1 })
        app.renderOverlay()
        state.drawing = false
        return
      }
      if (tool === 'col-marquee') {
        const x = Math.max(0, Math.min(app.doc.width - 1, Math.floor(p.x)))
        mergeSelection({ x, y: 0, w: 1, h: app.doc.height })
        app.renderOverlay()
        state.drawing = false
        return
      }
      if (tool === 'wand' && layer) {
        const lp = layerPt(p, layer)
        wandSelect(layer.canvas, lp.x, lp.y, layer.x, layer.y)
        app.renderOverlay()
        state.drawing = false
        return
      }
      if (layer?.locked && (paintTools.includes(tool) || toneTools.includes(tool) || shapeTools.includes(tool) || tool === 'fill' || tool === 'magic-eraser' || tool === 'gradient' || tool === 'clone' || tool === 'pen' || tool === 'smudge')) {
        app.toast('Layer is locked')
        state.drawing = false
        return
      }
      if (layer?.kind === 'text' && (paintTools.includes(tool) || toneTools.includes(tool) || shapeTools.includes(tool) || tool === 'fill' || tool === 'magic-eraser' || tool === 'gradient' || tool === 'clone' || tool === 'pen' || tool === 'smudge')) {
        app.doc.rasterizeText(layer)
      }
      if (tool === 'fill' && ctx) {
        const lp = layerPt(p, layer)
        floodFill(layer.canvas, lp.x, lp.y, app.doc.fg, false, state.wandTol, layer)
        app.doc.pushHistory('Paint Bucket')
        app.paint()
        state.drawing = false
        return
      }
      if (tool === 'magic-eraser' && ctx) {
        const lp = layerPt(p, layer)
        floodFill(layer.canvas, lp.x, lp.y, null, true, state.wandTol, layer)
        app.doc.pushHistory('Magic Eraser')
        app.paint()
        state.drawing = false
        return
      }
      if (tool === 'clone' && e.altKey) {
        state.cloneSrc = { x: p.x, y: p.y }
        app.toast('Clone source set')
        state.drawing = false
        return
      }
      if (paintTools.includes(tool) && ctx) {
        const lp = layerPt(p, layer)
        if (tool === 'history-brush') historyStamp(ctx, lp.x, lp.y, layer)
        else stampBrush(ctx, lp.x, lp.y, tool === 'eraser', tool === 'pencil', layer)
        app.paint()
      }
      if (toneTools.includes(tool) && ctx) {
        const lp = layerPt(p, layer)
        toneAt(ctx, lp.x, lp.y, tool)
        app.paint()
      }
      if (tool === 'text') {
        const hit = app.doc.hitLayerAt(p.x, p.y)
        const hitLayer = hit >= 0 ? app.doc.layers[hit] : null
        app.beginText(p, hitLayer?.kind === 'text' ? hitLayer : null)
        state.drawing = false
      }
      if (tool === 'path') return
    },
    move(e) {
      const p = docPt(e)
      app.cursor = p
      state.shift = e.shiftKey
      state.alt = e.altKey
      const tool = app.tool
      if (!state.drawing) {
        const wrapEl = document.getElementById('canvas-wrap')
        if ((tool === 'move' || tool === 'path') && state.showTransform) {
          const h = hitXfHandle(p)
          if (wrapEl) wrapEl.style.cursor = h ? XF_CURSOR[h] : 'default'
        } else if ((tool === 'crop' || tool === 'slice') && state.cropRect) {
          const h = hitCropHandle(p)
          if (wrapEl) wrapEl.style.cursor = h ? XF_CURSOR[h] || 'crosshair' : 'crosshair'
        } else if ((tool === 'marquee' || tool === 'ellipse-marquee') && app.doc.selection && !app.doc.selection.path) {
          const h = hitSelHandle(p)
          if (wrapEl) wrapEl.style.cursor = h ? XF_CURSOR[h] || 'crosshair' : 'crosshair'
        }
        app.renderOverlay()
        return
      }
      const { layer, ctx } = layerCtx()

      if (tool === 'hand') {
        app.doc.panX += e.movementX
        app.doc.panY += e.movementY
        app.layoutCanvas()
        state.last = p
        return
      }
      if ((tool === 'crop' || tool === 'slice') && state.cropHandle && state.cropStart) {
        if (state.cropHandle === 'move') {
          state.cropRect = {
            x: state.cropStart.x + (p.x - state.start.x),
            y: state.cropStart.y + (p.y - state.start.y),
            w: state.cropStart.w,
            h: state.cropStart.h
          }
        } else {
          state.cropRect = applyBoxResize(state.cropStart, state.cropHandle, p, e.altKey, e.shiftKey)
        }
        app.renderOverlay()
        state.last = p
        return
      }
      if (state.selHandle && state.selStartBox) {
        if (state.selHandle === 'move') {
          applySelBox({
            x: state.selStartBox.x + (p.x - state.start.x),
            y: state.selStartBox.y + (p.y - state.start.y),
            w: state.selStartBox.w,
            h: state.selStartBox.h
          })
        } else {
          applySelBox(applyBoxResize(state.selStartBox, state.selHandle, p, e.altKey, e.shiftKey))
        }
        app.renderOverlay()
        state.last = p
        return
      }
      if ((tool === 'move' || tool === 'path') && layer) {
        if (state.xfHandle && state.xfStartBox) {
          const b = state.xfStartBox
          const h = state.xfHandle
          if (h === 'rot' && state.xfOrigCanvas) {
            const cx = b.x + b.w / 2
            const cy = b.y + b.h / 2
            const ang = Math.atan2(p.y - cy, p.x - cx)
            let rad = ang - state.xfStartAngle
            if (e.shiftKey) rad = Math.round(rad / (Math.PI / 12)) * (Math.PI / 12)
            app.doc.rotateLayerFrom(layer, state.xfOrigCanvas, b, rad)
            app.paint()
            app.renderOverlay()
            state.last = p
            return
          }
          const next = applyBoxResize(b, h, p, e.altKey, e.shiftKey)
          app.doc.scaleLayerTo(layer, next.x, next.y, next.w, next.h)
          app.paint()
          app.renderOverlay()
          state.last = p
          return
        }
        if (layer.lockPos || layer.locked) {
          state.last = p
          return
        }
        let dx = p.x - state.last.x
        let dy = p.y - state.last.y
        if (e.shiftKey) {
          if (Math.abs(p.x - state.start.x) > Math.abs(p.y - state.start.y)) dy = 0
          else dx = 0
        }
        layer.x += dx
        layer.y += dy
        if (layer.kind === 'group') {
          app.doc.layers.forEach(l => {
            if (l.parentId === layer.id) { l.x += dx; l.y += dy }
          })
        }
        app.paint()
        app.renderOverlay()
        state.last = p
        return
      }
      if (paintTools.includes(tool) && ctx) {
        const a = layerPt(state.last, layer)
        const b = layerPt(p, layer)
        if (tool === 'history-brush') {
          const gap = Math.max(1, state.brushSize * 0.28)
          const n = Math.max(1, Math.ceil(dist(a, b) / gap))
          for (let i = 0; i <= n; i++) {
            const t = i / n
            historyStamp(ctx, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, layer)
          }
        } else {
          strokeBrush(ctx, a, b, tool === 'eraser', tool === 'pencil', layer)
        }
        app.paint()
      }
      if (tool === 'pen' && ctx) {
        const a = layerPt(state.last, layer)
        const b = layerPt(p, layer)
        ctx.save()
        app.doc.clipToSelection(ctx, layer?.x || 0, layer?.y || 0)
        ctx.strokeStyle = app.doc.fg
        ctx.lineWidth = Math.max(1, state.brushSize / 6)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = state.opacity / 100
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.restore()
        app.paint()
      }
      if (tool === 'clone' && ctx && state.cloneSrc) {
        const lp = layerPt(p, layer)
        cloneStamp(ctx, lp.x, lp.y)
        app.paint()
      }
      if (toneTools.includes(tool) && ctx) {
        const lp = layerPt(p, layer)
        toneAt(ctx, lp.x, lp.y, tool)
        app.paint()
      }
      if (tool === 'smudge' && ctx) {
        smudgeAt(ctx, layerPt(state.last, layer), layerPt(p, layer))
        app.paint()
      }
      state.last = p
      state.points.push(p)
      if ([...selectTools, ...shapeTools, 'gradient'].includes(tool)) app.renderOverlay()
    },
    up(e) {
      if (!state.drawing) return
      state.drawing = false
      const p = docPt(e)
      const tool = app.tool
      const { ctx } = layerCtx()
      if (state.cropHandle) {
        state.cropHandle = null
        state.cropStart = null
        app.renderOverlay()
        return
      }
      if (state.selHandle) {
        state.selHandle = null
        state.selStartBox = null
        app.renderOverlay()
        return
      }
      if (state.xfHandle) {
        state.xfHandle = null
        state.xfStartBox = null
        state.xfOrigCanvas = null
        app.doc.pushHistory('Transform')
        app.render()
      }

      if (tool === 'marquee' || tool === 'ellipse-marquee') {
        const r = rectFromPoints(state.start, p, e.shiftKey, e.altKey)
        mergeSelection((r.w < 2 || r.h < 2) ? null : { x: r.x, y: r.y, w: r.w, h: r.h, ellipse: tool === 'ellipse-marquee' })
        app.renderOverlay()
      }
      if (tool === 'lasso' || tool === 'poly-lasso' || tool === 'magnetic-lasso') {
        if (state.points.length > 4) {
          const xs = state.points.map(q => q.x)
          const ys = state.points.map(q => q.y)
          const x = Math.min(...xs), y = Math.min(...ys)
          mergeSelection({
            x, y,
            w: Math.max(...xs) - x,
            h: Math.max(...ys) - y,
            path: state.points.map(q => ({ x: q.x, y: q.y }))
          })
        }
        app.renderOverlay()
      }
      if (tool === 'crop' || tool === 'slice') {
        const r = rectFromPoints(state.start, p, e.shiftKey, e.altKey)
        if (r.w > 8 && r.h > 8) {
          state.cropRect = { x: r.x, y: r.y, w: r.w, h: r.h }
          app.toast('Press Enter to crop, Esc to cancel')
        }
        app.renderOverlay()
      }
      if (shapeTools.includes(tool) && ctx) {
        if (tool !== 'shape') state.shape = currentShapeKind()
        const layer = app.doc.currentLayer()
        if (currentShapeKind() === 'line') {
          const end = constrainLine(state.start, p, e.shiftKey)
          drawShape(ctx, layerPt(state.start, layer), layerPt(end, layer))
        } else {
          const r = rectFromPoints(state.start, p, e.shiftKey, e.altKey)
          drawShape(ctx, layerPt({ x: r.x, y: r.y }, layer), layerPt({ x: r.x + r.w, y: r.y + r.h }, layer))
        }
        app.doc.pushHistory('Shape')
        app.render()
      }
      if (tool === 'gradient' && ctx) {
        const layer = app.doc.currentLayer()
        const end = constrainLine(state.start, p, e.shiftKey)
        drawGradient(ctx, layerPt(state.start, layer), layerPt(end, layer))
        app.doc.pushHistory('Gradient')
        app.render()
      }
      const hist = {
        brush: 'Brush', pencil: 'Pencil', eraser: 'Eraser', pen: 'Pen',
        clone: 'Clone Stamp', blur: 'Blur', sharpen: 'Sharpen', dodge: 'Dodge',
        burn: 'Burn', heal: 'Spot Healing', 'red-eye': 'Red Eye', smudge: 'Smudge', move: 'Move', path: 'Move',
        'history-brush': 'History Brush'
      }
      if (hist[tool]) app.doc.pushHistory(hist[tool])
      app.renderOverlay()
    },
    overlay(ctx) {
      ctx.save()
      ctx.strokeStyle = '#0d99ff'
      ctx.setLineDash([4, 3])
      ctx.lineWidth = 1
      if ((app.tool === 'move' || app.tool === 'path') && state.showTransform) {
        const b = xfBox()
        if (b) {
          ctx.save()
          ctx.setLineDash([])
          ctx.strokeStyle = '#0d99ff'
          ctx.lineWidth = 1
          ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h)
          const hs = 4 / Math.max(0.25, app.doc.zoom)
          const pts = [
            [b.x, b.y], [b.x + b.w / 2, b.y], [b.x + b.w, b.y],
            [b.x + b.w, b.y + b.h / 2], [b.x + b.w, b.y + b.h],
            [b.x + b.w / 2, b.y + b.h], [b.x, b.y + b.h], [b.x, b.y + b.h / 2]
          ]
          ctx.fillStyle = '#fff'
          pts.forEach(([x, y]) => {
            ctx.fillRect(x - hs, y - hs, hs * 2, hs * 2)
            ctx.strokeRect(x - hs, y - hs, hs * 2, hs * 2)
          })
          const rot = rotHandlePt(b)
          if (rot) {
            ctx.beginPath()
            ctx.moveTo(b.x + b.w / 2, b.y)
            ctx.lineTo(rot.x, rot.y)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(rot.x, rot.y, hs * 1.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
          if (state.showDistances) {
            ctx.fillStyle = '#0d99ff'
            ctx.font = `${11 / Math.max(0.5, app.doc.zoom)}px sans-serif`
            ctx.fillText(`${Math.round(b.w)} × ${Math.round(b.h)}`, b.x + 6, b.y - 8)
            ctx.fillText(`${Math.round(b.x)}, ${Math.round(b.y)}`, b.x + 6, b.y + b.h + 14)
          }
          ctx.restore()
        }
      }
      const sb = selBox()
      const curTool = app.tool
      if (sb && (state.selXf || state.selHandle || curTool === 'marquee' || curTool === 'ellipse-marquee') && (!state.drawing || state.selHandle)) {
        const hs = 4 / Math.max(0.25, app.doc.zoom)
        const ch = boxHandles(sb)
        ctx.save()
        ctx.setLineDash([])
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#0d99ff'
        ctx.lineWidth = 1
        Object.values(ch).forEach(q => {
          ctx.fillRect(q.x - hs, q.y - hs, hs * 2, hs * 2)
          ctx.strokeRect(q.x - hs, q.y - hs, hs * 2, hs * 2)
        })
        ctx.restore()
      }
      if (state.cropRect && (!state.drawing || state.cropHandle)) {
        const c = state.cropRect
        ctx.strokeRect(c.x, c.y, c.w, c.h)
        ctx.fillStyle = 'rgba(0,0,0,.35)'
        ctx.fillRect(0, 0, app.doc.width, c.y)
        ctx.fillRect(0, c.y + c.h, app.doc.width, app.doc.height - c.y - c.h)
        ctx.fillRect(0, c.y, c.x, c.h)
        ctx.fillRect(c.x + c.w, c.y, app.doc.width - c.x - c.w, c.h)
        const hs = 4 / Math.max(0.25, app.doc.zoom)
        const ch = boxHandles(c)
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#0d99ff'
        ctx.setLineDash([])
        Object.values(ch).forEach(q => {
          ctx.fillRect(q.x - hs, q.y - hs, hs * 2, hs * 2)
          ctx.strokeRect(q.x - hs, q.y - hs, hs * 2, hs * 2)
        })
      }
      if (!state.drawing) {
        ctx.restore()
        return
      }
      const tool = app.tool
      const a = state.start
      const b = state.last
      if (!a || !b) { ctx.restore(); return }
      if ((tool === 'marquee' || tool === 'crop' || tool === 'slice' || tool === 'ellipse-marquee') && !state.cropHandle) {
        const r = rectFromPoints(a, b, state.shift, state.alt)
        if (tool === 'ellipse-marquee') {
          ctx.beginPath()
          ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.max(0.5, r.w / 2), Math.max(0.5, r.h / 2), 0, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.strokeRect(r.x, r.y, r.w, r.h)
        }
      }
      if (shapeTools.includes(tool) && currentShapeKind() !== 'line') {
        const r = rectFromPoints(a, b, state.shift, state.alt)
        drawShape(ctx, { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, true)
      } else if (shapeTools.includes(tool)) {
        drawShape(ctx, a, constrainLine(a, b, state.shift), true)
      }
      if (tool === 'gradient') {
        const end = constrainLine(a, b, state.shift)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
      }
      if ((tool === 'lasso' || tool === 'poly-lasso' || tool === 'magnetic-lasso') && state.points.length) {
        ctx.beginPath()
        ctx.moveTo(state.points[0].x, state.points[0].y)
        state.points.forEach(q => ctx.lineTo(q.x, q.y))
        ctx.stroke()
      }
      ctx.restore()
    }
  }
}
