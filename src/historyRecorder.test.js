import { describe, expect, it, vi } from 'vitest'
import { createHistoryRecorder } from './historyRecorder.js'

const buildRecorderSupabaseMock = ({ sessionUserId = 'user-1', sessionError = null } = {}) => {
  const getSessionMock = vi.fn().mockResolvedValue({
    data: sessionUserId ? { session: { user: { id: sessionUserId } } } : { session: null },
    error: sessionError,
  })

  const insertMock = vi.fn().mockResolvedValue({ data: [{ history_id: 11 }], error: null })
  const fromMock = vi.fn((table) => {
    if (table === 'history') return { insert: insertMock }
    return {}
  })

  return {
    client: { from: fromMock, auth: { getSession: getSessionMock } },
    calls: { fromMock, insertMock, getSessionMock },
  }
}

describe('HistoryRecorder', () => {
  it('明示操作ごとに履歴を1件記録する', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T09:00:00Z'))

    const { client, calls } = buildRecorderSupabaseMock()
    const recorder = createHistoryRecorder(client)

    const first = await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'navigate',
    })

    vi.advanceTimersByTime(600)

    const second = await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:01:00Z',
      source: 'navigate',
    })

    expect(calls.fromMock).toHaveBeenCalledWith('history')
    expect(calls.insertMock).toHaveBeenCalledTimes(2)
    expect(calls.insertMock).toHaveBeenNthCalledWith(1, {
      user_id: 'user-1',
      movie_id: 'movie-1',
      clicked_at: '2026-02-05T09:00:00Z',
    })
    expect(calls.insertMock).toHaveBeenNthCalledWith(2, {
      user_id: 'user-1',
      movie_id: 'movie-1',
      clicked_at: '2026-02-05T09:01:00Z',
    })

    expect(first).toEqual({ ok: true, data: { historyId: 11 } })
    expect(second).toEqual({ ok: true, data: { historyId: 11 } })

    vi.useRealTimers()
  })

  it('未ログイン時はauth_requiredを返し、記録しない', async () => {
    const { client, calls } = buildRecorderSupabaseMock({ sessionUserId: null })
    const recorder = createHistoryRecorder(client)

    const result = await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'navigate',
    })

    expect(result).toEqual({ ok: false, error: 'auth_required' })
    expect(calls.insertMock).not.toHaveBeenCalled()
  })

  it('同一movieIdとsourceの連続発火は抑止ウィンドウ内で記録しない', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T09:00:00Z'))

    const { client, calls } = buildRecorderSupabaseMock()
    const recorder = createHistoryRecorder(client)

    await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'play',
    })

    vi.advanceTimersByTime(200)

    await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'play',
    })

    vi.advanceTimersByTime(401)

    await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'play',
    })

    expect(calls.insertMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('同一movieIdでもsourceが異なる場合は抑止せず記録する', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T09:00:00Z'))

    const { client, calls } = buildRecorderSupabaseMock()
    const recorder = createHistoryRecorder(client)

    await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'navigate',
    })

    vi.advanceTimersByTime(200)

    await recorder.recordView({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T09:00:00Z',
      source: 'play',
    })

    expect(calls.insertMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
