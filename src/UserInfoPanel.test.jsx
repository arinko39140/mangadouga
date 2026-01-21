import { fireEvent, render, screen } from '@testing-library/react'
import UserInfoPanel from './UserInfoPanel.jsx'

describe('UserInfoPanel', () => {
  it('ユーザー名と見出しを表示する', () => {
    render(
      <UserInfoPanel
        profile={{ name: '星野', iconUrl: 'https://example.com/icon.png' }}
      />
    )

    expect(screen.getByRole('heading', { name: 'ユーザー情報' })).toBeInTheDocument()
    expect(screen.getByText('星野')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '星野のアイコン' })).toBeInTheDocument()
  })

  it('読み込み中の状態を表示する', () => {
    render(<UserInfoPanel isLoading />)

    expect(screen.getByRole('heading', { name: 'ユーザー情報' })).toBeInTheDocument()
    expect(screen.getByText('ユーザー情報を読み込み中...')).toBeInTheDocument()
  })

  it('アイコン未設定の場合は空状態を表示する', () => {
    render(<UserInfoPanel profile={{ name: '美咲', iconUrl: null }} />)

    expect(screen.getByText('アイコン未設定')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('対応外の画像形式は空状態を表示する', () => {
    render(
      <UserInfoPanel
        profile={{ name: '優', iconUrl: 'https://example.com/icon.svg' }}
      />
    )

    expect(screen.getByText('対応していない画像形式です。')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('画像読み込み失敗時は代替表示に切り替える', () => {
    render(
      <UserInfoPanel
        profile={{ name: '綾', iconUrl: 'https://example.com/icon.jpg' }}
      />
    )

    const image = screen.getByRole('img', { name: '綾のアイコン' })
    fireEvent.error(image)

    expect(screen.getByText('アイコンを読み込めませんでした。')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
