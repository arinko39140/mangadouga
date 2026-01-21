import { describe, expect, it, vi } from 'vitest'
import { createUserPageProvider } from './userPageProvider.js'

const buildUserSupabaseMock = ({ userRows = [], userError = null } = {}) => {
  const limitMock = vi.fn().mockResolvedValue({ data: userRows, error: userError })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn((table) => {
    if (table === 'users') {
      return { select: selectMock }
    }
    return { select: vi.fn() }
  })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock, limitMock },
  }
}

describe('UserPageProvider', () => {
  it('ユーザー情報と外部リンクを取得して整形する', async () => {
    const { client, calls } = buildUserSupabaseMock({
      userRows: [
        {
          user_id: 'user-1',
          name: 'テストユーザー',
          icon_url: 'https://example.com/icon.png',
          x_url: 'https://x.com/example',
          x_label: 'Xのリンク',
          youtube_url: 'https://youtu.be/abc',
          youtube_label: '',
          other_url: 'ftp://example.com',
          other_label: '無効リンク',
        },
      ],
    })
    const provider = createUserPageProvider(client)

    const result = await provider.fetchUserProfile('user-1')

    expect(calls.fromMock).toHaveBeenCalledWith('users')
    expect(calls.selectMock).toHaveBeenCalledWith(
      'user_id, name, icon_url, x_url, x_label, youtube_url, youtube_label, other_url, other_label'
    )
    expect(calls.eqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.limitMock).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user-1',
        name: 'テストユーザー',
        iconUrl: 'https://example.com/icon.png',
        links: [
          {
            category: 'x',
            url: 'https://x.com/example',
            label: 'Xのリンク',
          },
          {
            category: 'youtube',
            url: 'https://youtu.be/abc',
            label: null,
          },
        ],
      },
    })
  })

  it('http/httpsリンクのみを有効としてカテゴリを分類する', async () => {
    const { client } = buildUserSupabaseMock({
      userRows: [
        {
          user_id: 'user-2',
          name: 'リンク分類ユーザー',
          icon_url: null,
          x_url: 'https://twitter.com/example',
          x_label: '旧Twitter',
          youtube_url: 'http://youtube.com/watch?v=abc',
          youtube_label: 'YouTube',
          other_url: 'https://example.org/other',
          other_label: 'その他リンク',
        },
      ],
    })
    const provider = createUserPageProvider(client)

    const result = await provider.fetchUserProfile('user-2')

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user-2',
        name: 'リンク分類ユーザー',
        iconUrl: null,
        links: [
          {
            category: 'x',
            url: 'https://twitter.com/example',
            label: '旧Twitter',
          },
          {
            category: 'youtube',
            url: 'http://youtube.com/watch?v=abc',
            label: 'YouTube',
          },
          {
            category: 'other',
            url: 'https://example.org/other',
            label: 'その他リンク',
          },
        ],
      },
    })
  })

  it('ユーザーIDが空の場合はinvalid_inputを返す', async () => {
    const { client, calls } = buildUserSupabaseMock()
    const provider = createUserPageProvider(client)

    await expect(provider.fetchUserProfile('  ')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.fromMock).not.toHaveBeenCalled()
  })

  it('ユーザーが存在しない場合はnot_foundを返す', async () => {
    const { client } = buildUserSupabaseMock({ userRows: [] })
    const provider = createUserPageProvider(client)

    await expect(provider.fetchUserProfile('user-404')).resolves.toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('Supabase未設定の場合はnot_configuredを返す', async () => {
    const provider = createUserPageProvider(null)

    await expect(provider.fetchUserProfile('user-1')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })
})
