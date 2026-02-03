import { normalizeSortOrder } from './sortOrderPolicy.js'

const sortOptions = [
  { value: 'popular', label: '人気' },
  { value: 'favorite_asc', label: '人気(少ない順)' },
  { value: 'latest', label: '投稿日(新しい順)' },
  { value: 'oldest', label: '投稿日(古い順)' },
]

function SortControl({ sortOrder = 'popular', onChange }) {
  const normalizedSortOrder = normalizeSortOrder(sortOrder)

  return (
    <div className="work-page__sort-control" role="group" aria-label="並び順">
      {sortOptions.map((option) => {
        const isSelected = option.value === normalizedSortOrder
        return (
          <button
            key={option.value}
            type="button"
            className={
              isSelected ? 'work-page__sort-button is-selected' : 'work-page__sort-button'
            }
            aria-pressed={isSelected}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default SortControl
