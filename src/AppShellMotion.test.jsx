import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import AppShell from './AppShell.jsx'

describe('AppShell motion load', () => {
  it('初回ロード用のモーションクラスを付与する', () => {
    const { container } = render(
      <MemoryRouter>
        <AppShell>
          <div>content</div>
        </AppShell>
      </MemoryRouter>
    )

    const content = container.querySelector('.app-shell__content')
    expect(content).toBeTruthy()
    expect(content).toHaveClass('motion-load')
  })
})
