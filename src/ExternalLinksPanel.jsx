import './ExternalLinksPanel.css'

const categoryLabels = {
  x: 'X',
  youtube: 'YouTube',
  other: 'その他',
}

const isValidHttpUrl = (value) => {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function ExternalLinksPanel({ links = [] }) {
  const filteredLinks = links.filter((link) => isValidHttpUrl(link?.url))

  return (
    <section className="external-links" aria-live="polite">
      <header className="external-links__header">
        <h2 className="external-links__title">外部リンク</h2>
      </header>
      {filteredLinks.length === 0 ? (
        <p className="external-links__empty">外部リンクがありません。</p>
      ) : (
        <ul className="external-links__list" aria-label="外部リンク一覧">
          {filteredLinks.map((link) => {
            const label = link.label?.trim() || link.url
            const categoryLabel = categoryLabels[link.category] ?? categoryLabels.other
            return (
              <li key={`${link.category}-${link.url}`} className="external-links__item">
                <span className="external-links__category">{categoryLabel}</span>
                <a
                  className="external-links__link"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ExternalLinksPanel
