import { BrowserRouter } from 'react-router-dom'
import AppShell from './AppShell.jsx'
import AppRouter from './AppRouter.jsx'

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <AppRouter />
      </AppShell>
    </BrowserRouter>
  )
}

export default App
