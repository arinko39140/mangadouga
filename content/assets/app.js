const groups = document.querySelectorAll('[data-toggle-group]')

groups.forEach((group) => {
  const key = group.dataset.toggleGroup
  const stored = localStorage.getItem(`visibility:${key}`)
  const initial = stored || group.dataset.defaultVisibility || 'public'

  const setVisibility = (value) => {
    group.dataset.visibility = value
    const buttons = group.querySelectorAll('[data-visibility]')
    buttons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.visibility === value)
    })
    localStorage.setItem(`visibility:${key}`, value)
  }

  setVisibility(initial)

  group.addEventListener('click', (event) => {
    const button = event.target.closest('[data-visibility]')
    if (!button) return
    setVisibility(button.dataset.visibility)
  })
})
