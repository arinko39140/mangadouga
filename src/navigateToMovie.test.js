import { describe, expect, it, vi } from 'vitest'
import { createNavigateToMovie } from './navigateToMovie.js'

describe('navigateToMovie', () => {
  it('履歴記録後にselectedMovieId付きで遷移する', async () => {
    const calls = []
    const recordView = vi.fn(async () => {
      calls.push('record')
      return { ok: true }
    })
    const navigate = vi.fn((path) => {
      calls.push(['navigate', path])
    })
    const navigateToMovie = createNavigateToMovie({
      navigate,
      historyRecorder: { recordView },
      now: () => '2026-02-05T10:00:00Z',
    })

    await navigateToMovie({ seriesId: 'series-1', movieId: 'movie-1' })

    expect(recordView).toHaveBeenCalledWith({
      movieId: 'movie-1',
      clickedAt: '2026-02-05T10:00:00Z',
      source: 'navigate',
    })
    expect(navigate).toHaveBeenCalledWith('/series/series-1/?selectedMovieId=movie-1')
    expect(calls[0]).toBe('record')
    expect(calls[1][0]).toBe('navigate')
  })

  it('履歴記録に失敗しても遷移する', async () => {
    const recordView = vi.fn().mockRejectedValue(new Error('network'))
    const navigate = vi.fn()
    const navigateToMovie = createNavigateToMovie({
      navigate,
      historyRecorder: { recordView },
      now: () => '2026-02-05T10:00:00Z',
    })

    await navigateToMovie({ seriesId: 'series-1', movieId: 'movie-1' })

    expect(navigate).toHaveBeenCalledWith('/series/series-1/?selectedMovieId=movie-1')
  })

  it('movieIdがない場合は履歴記録せずに遷移する', async () => {
    const recordView = vi.fn()
    const navigate = vi.fn()
    const navigateToMovie = createNavigateToMovie({
      navigate,
      historyRecorder: { recordView },
      now: () => '2026-02-05T10:00:00Z',
    })

    await navigateToMovie({ seriesId: 'series-1' })

    expect(recordView).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/series/series-1/')
  })
})
