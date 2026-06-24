import { Routes, Route, Navigate } from 'react-router-dom'
import DisplayPage from './pages/DisplayPage'
import ConfigPage from './pages/ConfigPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DisplayPage />} />
      <Route path="/config" element={<ConfigPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
