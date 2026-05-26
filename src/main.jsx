import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { SkzDataProvider } from './context/SkzDataContext.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <SkzDataProvider>
        <App />
      </SkzDataProvider>
    </ErrorBoundary>
  </StrictMode>,
)
