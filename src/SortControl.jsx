import { useMemo, useRef } from 'react'
import { normalizeSortOrder } from './sortOrderPolicy.js'

const defaultOptions = [
  { value: 'popular', label: '人気' },
  { value: 'favorite_asc', label: '人気(少ない順)' },
  { value: 'latest', label: '投稿日(新しい順)' },
  { value: 'oldest', label: '投稿日(古い順)' },
]

function SortControl({
  sortOrder = 'popular',
  onChange,
  options = defaultOptions,
  label = '並び順',
}) {
  const normalizedSortOrder = normalizeSortOrder(sortOrder)
  const detailsRef = useRef(null)
  const currentOption = useMemo(() => {
    return options.find((option) => option.value === normalizedSortOrder) ?? options[0]
  }, [normalizedSortOrder, options])

  const handleSelect = (value) => {
    onChange?.(value)
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return (
    <details className="sort-control" ref={detailsRef}>
      <summary className="sort-control__summary">
        {label}: {currentOption?.label ?? '未選択'}
      </summary>
      <div className="sort-control__menu" role="group" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === normalizedSortOrder
          return (
            <button
              key={option.value}
              type="button"
              className={
                isSelected ? 'sort-control__option is-selected' : 'sort-control__option'
              }
              aria-pressed={isSelected}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </details>
  )
}

export default SortControl
