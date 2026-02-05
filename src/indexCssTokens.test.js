import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')

const requiredTokens = [
  '--color-text',
  '--color-text-strong',
  '--color-text-muted',
  '--color-surface',
  '--color-surface-elevated',
  '--color-accent',
  '--color-accent-secondary',
  '--color-warning',
  '--focus-ring-color',
  '--focus-ring-width',
  '--shadow-card',
  '--radius-card',
  '--space-2',
  '--space-3',
  '--space-4',
  '--font-body',
  '--font-heading',
  '--font-display',
  '--font-caption',
]

describe('index.css UI tokens', () => {
  it('defines required tokens', () => {
    requiredTokens.forEach((token) => {
      expect(css).toMatch(new RegExp(`${token}\\s*:`))
    })
  })

  it('scopes base typography to React pages with shared hierarchy', () => {
    expect(css).toContain('.app-shell__content > :not(.ui-scope-exclude)')
    expect(css).toMatch(/font-family:\s*var\(--font-body\)/)
    expect(css).toMatch(/font-family:\s*var\(--font-heading\)/)
    expect(css).toMatch(/font-family:\s*var\(--font-display\)/)
    expect(css).toMatch(/font-family:\s*var\(--font-caption\)/)
  })

  it('defines shared navigation pattern styles', () => {
    expect(css).toContain('.nav-pattern')
    expect(css).toContain('.nav-pattern__items')
    expect(css).toContain('.nav-pattern__item')
    expect(css).toContain('.nav-pattern__item.is-active')
  })

  it('defines shared card patterns and collection layouts', () => {
    expect(css).toContain('.card-primary')
    expect(css).toContain('.card-secondary')
    expect(css).toContain('.card-collection')
    expect(css).toContain('.card-collection--grid')
    expect(css).toContain('.card-collection--list')
  })
})
