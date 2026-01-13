import { useMemo, useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient.js'

const seedMovies = [
  {
    title: '銀河とレモネード',
  },
  {
    title: '夜の図書館',
  },
  {
    title: '波打ち際の手紙',
  },
]

const emptyForm = {
  title: '',
}

function App() {
  const [movies, setMovies] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dbError, setDbError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchMovies = async () => {
      if (!supabase) {
        if (isMounted) {
          setDbError('Supabaseの設定が見つかりません。')
          setIsLoading(false)
        }
        return
      }
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (isMounted) setMovies(data ?? [])
      } catch (error) {
        if (!isMounted) return
        setDbError('データベースの読み込みに失敗しました。')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchMovies()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredMovies = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return movies
    return movies.filter((movie) =>
      [movie.title].filter(Boolean).some((value) => value.toLowerCase().includes(keyword))
    )
  }, [movies, query])

  const latestMovie = movies[0]

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    if (!supabase) {
      setDbError('Supabaseの設定が見つかりません。')
      return
    }

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from('movies')
          .update({ title: form.title.trim() })
          .eq('id', editingId)
          .select()
          .single()

        if (error) throw error
        setMovies((prev) =>
          prev.map((movie) => (movie.id === editingId ? { ...movie, ...data } : movie))
        )
      } else {
        const { data, error } = await supabase
          .from('movies')
          .insert([{ title: form.title.trim() }])
          .select()
          .single()

        if (error) throw error
        setMovies((prev) => [data, ...prev])
      }
      resetForm()
    } catch (error) {
      setDbError('データベースの保存に失敗しました。')
    }
  }

  const handleEdit = (movie) => {
    setEditingId(movie.id)
    setForm({
      title: movie.title || '',
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('このムービーを削除しますか？')) return
    if (!supabase) {
      setDbError('Supabaseの設定が見つかりません。')
      return
    }

    try {
      const { error } = await supabase.from('movies').delete().eq('id', id)
      if (error) throw error
      setMovies((prev) => prev.filter((movie) => movie.id !== id))
      if (editingId === id) resetForm()
    } catch (error) {
      setDbError('データベースの削除に失敗しました。')
    }
  }

  const handleDuplicate = async (movie) => {
    if (!supabase) {
      setDbError('Supabaseの設定が見つかりません。')
      return
    }

    try {
      const { data, error } = await supabase
        .from('movies')
        .insert([{ title: `${movie.title}（コピー）` }])
        .select()
        .single()

      if (error) throw error
      setMovies((prev) => [data, ...prev])
    } catch (error) {
      setDbError('データベースの保存に失敗しました。')
    }
  }

  const handleResetSeed = async () => {
    if (!window.confirm('サンプルのムービーを復元しますか？')) return
    if (!supabase) {
      setDbError('Supabaseの設定が見つかりません。')
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('movies')
        .delete()
        .not('id', 'is', null)

      if (deleteError) throw deleteError

      const { data, error: insertError } = await supabase
        .from('movies')
        .insert(seedMovies)
        .select()

      if (insertError) throw insertError
      setMovies(data ?? [])
      resetForm()
    } catch (error) {
      setDbError('データベースの更新に失敗しました。')
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">ムービー×ブログ CRUD ノート</p>
          <h1>初学者向けムービー記事の管理練習</h1>
          <p className="hero__lead">
            ここでは「ムービーの感想記事」を題材に、作成・編集・削除の流れを体験できます。
            入力した内容はクラウドのデータベースに保存され、ページを閉じても残ります。
          </p>
        </div>
        <div className="hero__stats">
          <div>
            <span>登録数</span>
            <strong>{movies.length}</strong>
          </div>
          <div>
            <span>最新</span>
            <strong>{latestMovie ? latestMovie.title : '---'}</strong>
          </div>
          <div>
            <span>保存先</span>
            <strong>Supabase (PostgreSQL)</strong>
          </div>
        </div>
        {dbError ? <p className="hero__notice">{dbError}</p> : null}
      </header>

      <section className="workspace">
        <div className="panel">
          <div className="panel__header">
            <h2>{editingId ? 'ムービーを編集' : 'ムービーを追加'}</h2>
            <p>タイトルは必須。他は自由にカスタムしてください。</p>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              タイトル<span>必須</span>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="例：星空と朝のパン"
                required
                disabled={isLoading}
              />
            </label>
            <div className="form__actions">
              <button type="submit" className="button button--primary">
                {editingId ? '更新する' : '追加する'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={resetForm}
              >
                入力をクリア
              </button>
            </div>
          </form>
          <div className="panel__footer">
            <div>
              <strong>練習ステップ</strong>
              <ol>
                <li>新しいムービーを追加</li>
                <li>編集ボタンで書き直す</li>
                <li>不要なら削除</li>
              </ol>
            </div>
            <button type="button" className="button button--text" onClick={handleResetSeed}>
              サンプルを復元する
            </button>
          </div>
        </div>

        <div className="panel panel--list">
          <div className="panel__header panel__header--row">
            <div>
              <h2>ムービー一覧</h2>
              <p>検索で記事が増えても見つけやすく。</p>
            </div>
            <label className="search">
              <span>検索</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="タイトルで検索"
              />
            </label>
          </div>
          <div className="movie-list">
            {isLoading ? (
              <div className="empty">
                <h3>読み込み中です</h3>
                <p>データベースの準備ができるまでお待ちください。</p>
              </div>
            ) : filteredMovies.length === 0 ? (
              <div className="empty">
                <h3>まだムービーがありません</h3>
                <p>左のフォームから最初のムービーを追加しましょう。</p>
              </div>
            ) : (
              filteredMovies.map((movie) => (
                <article key={movie.id} className="movie-card">
                  <header>
                    <div>
                      <h3>{movie.title}</h3>
                    </div>
                  </header>
                  <div className="movie-card__actions">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleEdit(movie)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => handleDuplicate(movie)}
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => handleDelete(movie.id)}
                    >
                      削除
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
