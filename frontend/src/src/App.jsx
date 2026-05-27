import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LogCatchPage from './pages/LogCatchPage'
import CatchHistoryPage from './pages/CatchHistoryPage'

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">🎣 Fishing App</h1>
            <ul className="flex space-x-6">
              <li><Link to="/" className="hover:text-blue-200">Dashboard</Link></li>
              <li><Link to="/log-catch" className="hover:text-blue-200">Log Catch</Link></li>
              <li><Link to="/history" className="hover:text-blue-200">History</Link></li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log-catch" element={<LogCatchPage />} />
            <Route path="/history" element={<CatchHistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
