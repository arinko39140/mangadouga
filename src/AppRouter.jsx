import { Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage.jsx'
import TopPage from './TopPage.jsx'
import OshiFavoritesPage from './OshiFavoritesPage.jsx'
import OshiListPage from './OshiListPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import OshiMyListPage from './OshiMyListPage.jsx'
import WorkPage from './WorkPage.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/login/" element={<LoginPage />} />
      <Route path="/oshi-lists/" element={<OshiMyListPage />} />
      <Route path="/oshi-lists/catalog/" element={<OshiListsPage />} />
      <Route path="/oshi-lists/:listId/" element={<OshiListPage />} />
      <Route path="/oshi-lists/favorites/" element={<OshiFavoritesPage />} />
      <Route path="/series/:seriesId/" element={<WorkPage />} />
    </Routes>
  )
}

export default AppRouter
