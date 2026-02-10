import { useEffect, useRef } from 'react'

let youtubeApiPromise

const loadYouTubeIframeApi = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('youtube-iframe-api')
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady()
      }
      resolve(window.YT)
    }

    if (existingScript) return

    const tag = document.createElement('script')
    tag.id = 'youtube-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'

    const firstScript = document.getElementsByTagName('script')[0]
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(tag, firstScript)
    } else {
      document.head.appendChild(tag)
    }
  })

  return youtubeApiPromise
}

const buildYouTubeEmbedUrl = (videoUrl) => {
  if (!videoUrl) return null

  let parsed
  try {
    parsed = new URL(videoUrl)
  } catch {
    return null
  }

  const hostname = parsed.hostname.replace(/^www\./, '')
  const pathname = parsed.pathname

  const buildEmbedUrl = (id) => {
    if (!id) return null
    const url = new URL(`https://www.youtube.com/embed/${id}`)
    url.searchParams.set('enablejsapi', '1')
    url.searchParams.set('playsinline', '1')
    if (typeof window !== 'undefined' && window.location?.origin) {
      url.searchParams.set('origin', window.location.origin)
    }
    return url.toString()
  }

  if (hostname === 'youtu.be') {
    const id = pathname.split('/').filter(Boolean)[0]
    return buildEmbedUrl(id)
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return buildEmbedUrl(id)
    }

    if (pathname.startsWith('/embed/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return buildEmbedUrl(id)
    }

    if (pathname.startsWith('/shorts/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return buildEmbedUrl(id)
    }
  }

  return null
}

function PlaybackPanel({ episode, isLoading, onPlay }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const recordedRef = useRef(new Set())

  useEffect(() => {
    const embedUrl = buildYouTubeEmbedUrl(episode?.videoUrl)
    if (!embedUrl || !episode?.id || typeof onPlay !== 'function') return undefined

    let cancelled = false

    const setupPlayer = async () => {
      const yt = await loadYouTubeIframeApi()
      if (cancelled || !yt?.Player || !iframeRef.current) return

      if (playerRef.current?.destroy) {
        playerRef.current.destroy()
      }

      playerRef.current = new yt.Player(iframeRef.current, {
        events: {
          onStateChange: (event) => {
            if (event?.data === yt.PlayerState?.PLAYING) {
              if (!recordedRef.current.has(episode.id)) {
                recordedRef.current.add(episode.id)
                onPlay(episode)
              }
            }
          },
        },
      })
    }

    setupPlayer()

    return () => {
      cancelled = true
      if (playerRef.current?.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [episode, onPlay])
  if (isLoading) {
    return <p className="work-page__status">再生準備中...</p>
  }

  if (!episode) {
    return <p className="work-page__status">話数が選択されていません。</p>
  }

  if (!episode.videoUrl) {
    return <p className="work-page__status">動画URLが未設定です。</p>
  }

  const embedUrl = buildYouTubeEmbedUrl(episode.videoUrl)

  if (!embedUrl) {
    return (
      <div className="work-page__playback-fallback">
        <p className="work-page__status">対応していない動画URLです。</p>
        <a
          className="work-page__playback-link"
          href={episode.videoUrl}
          target="_blank"
          rel="noreferrer"
        >
          元の動画を開く
        </a>
      </div>
    )
  }

  return (
    <div className="work-page__player">
      <iframe
        key={episode.id}
        ref={iframeRef}
        title={`再生中: ${episode.title}`}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export default PlaybackPanel
