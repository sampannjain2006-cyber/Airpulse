import { Dashboard } from './pages/Dashboard'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

function App() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  )
}

export default App

