import { Route, Routes } from 'react-router-dom'
import TopPage from './TopPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import WorkPage from './WorkPage.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/oshi-lists/" element={<OshiListsPage />} />
      <Route path="/series/:seriesId/" element={<WorkPage />} />
    </Routes>
  )
}

export default AppRouter
