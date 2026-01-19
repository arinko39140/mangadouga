import { describe, expect, it, vi } from 'vitest'
import { buildLoginRedirectPath, createAuthGate } from './authGate.js'

describe('AuthGate', () => {
  it('認証済みの場合はokで返す', async () => {
    const supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1' } } },
          error: null,
        }),
      },
    }
    const authGate = createAuthGate({ supabaseClient })

    const result = await authGate.getStatus()

    expect(result).toEqual({ ok: true, status: { isAuthenticated: true } })
  })

  it('未ログインまたは取得失敗時は未ログイン扱いで返す', async () => {
    const noSessionClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    }
    const errorClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error('boom'),
        }),
      },
    }

    await expect(createAuthGate({ supabaseClient: noSessionClient }).getStatus()).resolves.toEqual(
      { ok: false, error: { type: 'auth_required' } }
    )
    await expect(createAuthGate({ supabaseClient: errorClient }).getStatus()).resolves.toEqual({
      ok: false,
      error: { type: 'auth_required' },
    })
  })

  it('ログイン導線はリダイレクト情報を含める', () => {
    const navigate = vi.fn()
    const authGate = createAuthGate({
      navigate,
      getRedirectContext: () => ({
        seriesId: 'series-1',
        selectedMovieId: 'movie-1',
        sortOrder: 'oldest',
      }),
    })

    authGate.redirectToLogin('favorite')

    expect(navigate).toHaveBeenCalledWith(
      '/login/?redirect=%2Fseries%2Fseries-1%2F%3FselectedMovieId%3Dmovie-1%26sortOrder%3Doldest'
    )
  })

  it('リダイレクト情報が不足している場合はログイン画面へ遷移する', () => {
    expect(buildLoginRedirectPath(null)).toBe('/login/')
  })
})
