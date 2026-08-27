import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import path from 'path'

// Pre-compute line start offsets once per file for O(log n) line/column lookups
function buildLineIndex(source) {
  const offsets = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

function getLineColumn(offsets, index) {
  let lo = 0,
    hi = offsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= index) lo = mid
    else hi = mid - 1
  }
  return { line: lo + 1, column: index - offsets[lo] + 1 }
}

// Skip metadata/position keys that are never AST children — everything else is traversed.
const SKIP_KEYS = new Set([
  'type',
  'start',
  'end',
  'loc',
  'span',
  'range',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'raw',
  'extra',
  'optional',
  'definite',
  'declare',
  'selfClosing',
  'shorthand',
  'computed',
  'method',
  'async',
  'generator',
  'static',
  'abstract',
  'override',
  'readonly',
  'accessibility',
  'kind',
  'operator',
  'prefix',
  'delegate',
  'regex',
  'bigint',
])

function hasJSXExpressions(node) {
  if (!node || typeof node !== 'object') return false

  if (node.type === 'JSXAttribute' && node.name.name !== 'className') {
    return false
  }

  if (node.type === 'JSXExpressionContainer' && node.expression.type !== 'Literal') {
    return true
  }

  const keys = Object.keys(node)
  for (let k = 0; k < keys.length; k++) {
    if (SKIP_KEYS.has(keys[k])) continue
    const child = node[keys[k]]
    if (child == null || typeof child !== 'object') continue
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) {
        if (hasJSXExpressions(child[i])) return true
      }
    } else {
      if (hasJSXExpressions(child)) return true
    }
  }

  return false
}

export default function oxcDeepUidPlugin() {
  return {
    name: 'vite-plugin-oxc-deep-uid',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(t|j)sx$/.test(id) || id.includes('node_modules')) return

      const s = new MagicString(code)

      const parseResult = parseSync(id, code, {
        sourceType: 'module',
      })

      const relativeFilename = path.relative(process.cwd(), id).replace(/\\/g, '/')
      const lineOffsets = buildLineIndex(code)

      function visit(node, parent) {
        if (!node || typeof node !== 'object') return

        if (node.type === 'JSXOpeningElement' && node.name) {
          const { line, column } = getLineColumn(lineOffsets, node.start)
          const uniqueId = `${relativeFilename}:${line}:${column}`

          const prohibitions = []

          if (node.selfClosing || hasJSXExpressions(parent)) {
            prohibitions.push('editContent')
          }

          s.appendLeft(
            node.name.end,
            ` data-uid="${uniqueId}" data-prohibitions="[${prohibitions.join(',')}]"`,
          )
        }

        const keys = Object.keys(node)
        for (let k = 0; k < keys.length; k++) {
          if (SKIP_KEYS.has(keys[k])) continue
          const child = node[keys[k]]
          if (child == null || typeof child !== 'object') continue
          if (Array.isArray(child)) {
            for (let i = 0; i < child.length; i++) {
              visit(child[i], node)
            }
          } else {
            visit(child, node)
          }
        }
      }

      visit(parseResult.program, null)

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true }),
      }
    },
  }
}
