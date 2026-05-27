import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LogCatchPage from './pages/LogCatchPage';
import CatchHistoryPage from './pages/CatchHistoryPage';
import './index.css';

function App() {
    return (
          <Router>
                <div className="min-h-screen bg-gray-50">
                  {/* Navigation */}
                        <nav className="bg-blue-600 text-white p-4 shadow-lg">
                                  <div className="max-w-7xl mx-auto flex justify-between items-center">
                                              <h1 className="text-2xl font-bold">Fishing Catch Log</h1>h1>
                                              <div className="space-x-4">
                                                            <Link to="/" className="hover:bg-blue-700 px-3 py-2 rounded">
                                                                            Dashboard
                                                            </Link>Link>
                                                            <Link to="/log" className="hover:bg-blue-700 px-3 py-2 rounded">
                                                                            Log Catch
                                                            </Link>Link>
                                                            <Link to="/history" className="hover:bg-blue-700 px-3 py-2 rounded">
                                                                            History
                                                            </Link>Link>
                                              </div>div>
                                  </div>div>
                        </nav>nav>
                
                  {/* Routes */}
                        <Routes>
                                  <Route path="/" element={<Dashboard />} />
                                  <Route path="/log" element={<LogCatchPage />} />
                                  <Route path="/history" element={<CatchHistoryPage />} />
                        </Routes>Routes>
                </div>div>
          </Router>Router>
        );
}

export default App;</Router>
