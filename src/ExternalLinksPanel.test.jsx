import { render, screen } from '@testing-library/react'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'

describe('ExternalLinksPanel', () => {
  it('表示名を優先し、カテゴリとリンク属性を表示する', () => {
    const links = [
      { category: 'x', url: 'https://x.com/oshi', label: 'X公式' },
      { category: 'youtube', url: 'https://youtu.be/abcd', label: null },
      { category: 'other', url: 'https://example.com', label: '公式サイト' },
    ]

    render(<ExternalLinksPanel links={links} />)

    expect(screen.getByRole('heading', { name: '外部リンク' })).toBeInTheDocument()
    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('その他')).toBeInTheDocument()

    const xLink = screen.getByRole('link', { name: 'X公式' })
    expect(xLink).toHaveAttribute('href', 'https://x.com/oshi')
    expect(xLink).toHaveAttribute('target', '_blank')
    expect(xLink).toHaveAttribute('rel', 'noopener noreferrer')

    const youtubeLink = screen.getByRole('link', { name: 'https://youtu.be/abcd' })
    expect(youtubeLink).toHaveAttribute('href', 'https://youtu.be/abcd')

    const otherLink = screen.getByRole('link', { name: '公式サイト' })
    expect(otherLink).toHaveAttribute('href', 'https://example.com')
  })

  it('http/https以外のリンクは表示しない', () => {
    const links = [
      { category: 'other', url: 'ftp://example.com', label: 'FTP' },
      { category: 'other', url: 'mailto:info@example.com', label: 'Mail' },
      { category: 'other', url: 'https://valid.example.com', label: '有効' },
    ]

    render(<ExternalLinksPanel links={links} />)

    expect(screen.getByRole('link', { name: '有効' })).toBeInTheDocument()
    expect(screen.queryByText('FTP')).not.toBeInTheDocument()
    expect(screen.queryByText('Mail')).not.toBeInTheDocument()
  })

  it('有効なリンクが0件の場合は空状態を表示する', () => {
    render(<ExternalLinksPanel links={[]} />)

    expect(screen.getByText('外部リンクがありません。')).toBeInTheDocument()
  })
})
