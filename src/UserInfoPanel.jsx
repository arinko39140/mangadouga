import { useEffect, useMemo, useState } from 'react'
import './UserInfoPanel.css'

const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/apng',
]

const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.apng']

const getExtension = (url) => {
  try {
    const parsed = new URL(url, 'https://example.com')
    const pathname = parsed.pathname.toLowerCase()
    const dotIndex = pathname.lastIndexOf('.')
    if (dotIndex === -1) return ''
    return pathname.slice(dotIndex)
  } catch {
    return ''
  }
}

const isSupportedImageUrl = (url) => {
  if (!url) return false
  if (url.startsWith('data:')) {
    const mimeType = url.slice(5).split(';')[0]?.toLowerCase()
    return SUPPORTED_MIME_TYPES.includes(mimeType)
  }
  const extension = getExtension(url)
  return SUPPORTED_EXTENSIONS.includes(extension)
}

function UserInfoPanel({ profile, isLoading = false }) {
  const [hasImageError, setHasImageError] = useState(false)
  const name = profile?.name ?? ''
  const iconUrl = profile?.iconUrl ?? null
  const isValidIcon = useMemo(() => isSupportedImageUrl(iconUrl), [iconUrl])

  useEffect(() => {
    setHasImageError(false)
  }, [iconUrl])

  const renderStatus = () => {
    if (isLoading) {
      return <p className="user-info__status">ユーザー情報を読み込み中...</p>
    }
    if (name) {
      return <p className="user-info__name">{name}</p>
    }
    return <p className="user-info__name user-info__name--empty">ユーザー名未設定</p>
  }

  const renderAvatar = () => {
    if (!iconUrl) {
      return <span className="user-info__avatar-placeholder">アイコン未設定</span>
    }
    if (!isValidIcon) {
      return (
        <span className="user-info__avatar-placeholder">
          対応していない画像形式です。
        </span>
      )
    }
    if (hasImageError) {
      return (
        <span className="user-info__avatar-placeholder">
          アイコンを読み込めませんでした。
        </span>
      )
    }
    return (
      <img
        className="user-info__avatar-image"
        src={iconUrl}
        alt={name ? `${name}のアイコン` : 'ユーザーアイコン'}
        onError={() => setHasImageError(true)}
      />
    )
  }

  return (
    <section className="user-info" aria-live="polite">
      <header className="user-info__header">
        <h2 className="user-info__title">ユーザー情報</h2>
      </header>
      <div className="user-info__body">
        <div className="user-info__avatar">{renderAvatar()}</div>
        {renderStatus()}
      </div>
    </section>
  )
}

export default UserInfoPanel
