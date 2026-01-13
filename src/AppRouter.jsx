import { Route, Routes } from 'react-router-dom'
import TopPage from './TopPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/oshi-lists/" element={<OshiListsPage />} />
    </Routes>
  )
}

export default AppRouter
