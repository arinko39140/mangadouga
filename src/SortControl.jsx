const sortOptions = [
  { value: 'latest', label: '最新話' },
  { value: 'oldest', label: '古い順' },
]

function SortControl({ sortOrder = 'latest', onChange }) {
  return (
    <div className="work-page__sort-control" role="group" aria-label="並び順">
      {sortOptions.map((option) => {
        const isSelected = option.value === sortOrder
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
