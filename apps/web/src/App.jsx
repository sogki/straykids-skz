import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Closed from './pages/Closed'

/** SKZ Arcade is permanently offline — every path shows the closing page. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Closed />} />
      </Routes>
    </BrowserRouter>
  )
}
