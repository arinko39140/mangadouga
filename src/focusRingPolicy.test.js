import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const indexCss = readFileSync(resolve(__dirname, 'index.css'), 'utf8')
const appCss = readFileSync(resolve(__dirname, 'App.css'), 'utf8')
const loginCss = readFileSync(resolve(__dirname, 'LoginPage.css'), 'utf8')

describe('focus ring policy', () => {
  it('defines a shared focus-visible rule for interactive elements', () => {
    expect(indexCss).toContain('.focus-ring:focus-visible')
    expect(indexCss).toMatch(
      /:is\(\s*a,\s*button,\s*input,\s*select,\s*textarea,\s*summary,\s*\[role="button"\],\s*\[tabindex\]:not\(\[tabindex="-1"\]\)\s*\):focus-visible/
    )
    expect(indexCss).toMatch(/outline:\s*var\(--focus-ring-width\)\s*solid\s*var\(--focus-ring-color\)/)
    expect(indexCss).toMatch(/outline-offset:\s*2px/)
  })

  it('avoids disabling focus outlines in page styles', () => {
    expect(appCss).not.toMatch(/outline:\s*none/)
    expect(loginCss).not.toMatch(/outline:\s*none/)
  })
})
