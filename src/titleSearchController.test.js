import { describe, expect, it, vi } from 'vitest'
import { createTitleSearchController } from './titleSearchController.js'

const buildController = () => createTitleSearchController()

describe('titleSearchController', () => {
  it('入力値の更新は入力中でも適用クエリを変更しない', () => {
    const controller = buildController()

    controller.setInput('  HERO  ')

    expect(controller.state.inputValue).toBe('  HERO  ')
    expect(controller.state.appliedQuery).toBe('')
    expect(controller.state.normalizedQuery).toBe('')
    expect(controller.state.status).toBe('idle')
  })

  it('検索適用時に入力値を適用クエリとして保持する', async () => {
    const controller = createTitleSearchController({
      dataProvider: { fetchAllItems: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
    })

    controller.setInput('  HERO  ')
    await controller.applySearch()

    expect(controller.state.appliedQuery).toBe('  HERO  ')
    expect(controller.state.normalizedQuery).toBe('hero')
    expect(controller.state.status).toBe('active')
  })

  it('正規化後に空となるクエリは未適用状態へ戻す', async () => {
    const controller = buildController()

    controller.setInput('   ')
    await controller.applySearch()

    expect(controller.state.appliedQuery).toBe('')
    expect(controller.state.normalizedQuery).toBe('')
    expect(controller.state.status).toBe('idle')
  })

  it('検索実行時にデータ取得して結果を更新する', async () => {
    const fetchAllItems = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: '1', title: 'Hero Academia' },
        { id: '2', title: 'One Piece' },
      ],
    })
    const controller = createTitleSearchController({
      dataProvider: { fetchAllItems },
    })

    controller.setInput('hero')
    await controller.applySearch()

    expect(fetchAllItems).toHaveBeenCalledTimes(1)
    expect(controller.state.status).toBe('active')
    expect(controller.state.results.map((item) => item.id)).toEqual(['1'])
  })

  it('再検索時はキャッシュを再利用して結果を更新する', async () => {
    const fetchAllItems = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: '1', title: 'Hero Academia' },
        { id: '2', title: 'One Piece' },
      ],
    })
    const controller = createTitleSearchController({
      dataProvider: { fetchAllItems },
    })

    controller.setInput('hero')
    await controller.applySearch()

    controller.setInput('piece')
    await controller.applySearch()

    expect(fetchAllItems).toHaveBeenCalledTimes(1)
    expect(controller.state.results.map((item) => item.id)).toEqual(['2'])
  })

  it('取得失敗時はエラー状態と空結果を保持する', async () => {
    const fetchAllItems = vi.fn().mockResolvedValue({
      ok: false,
      error: 'network',
    })
    const controller = createTitleSearchController({
      dataProvider: { fetchAllItems },
    })

    controller.setInput('hero')
    await controller.applySearch()

    expect(controller.state.status).toBe('error')
    expect(controller.state.error).toBe('network')
    expect(controller.state.results).toEqual([])
  })
})
