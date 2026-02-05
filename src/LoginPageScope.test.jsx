import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

describe('LoginPage scope exclusion', () => {
  it('marks the login page root as excluded from the shared UI scope', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(resolve(__dirname, 'LoginPage.jsx'), 'utf8')
    expect(source).toMatch(/className=\"login-page ui-scope-exclude\"/)
  })
})
