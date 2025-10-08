import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import ManualMergePage from './pages/ManualMergePage';
import HistoryPage from './pages/HistoryPage';
import Header from './components/Header';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        // Check authentication status
        axios
            .get('/api/user/me')
            .then((res) => {
                setIsAuthenticated(!!res.data?.user?.id);
            })
            .catch(() => {
                setIsAuthenticated(false);
            });
    }, []);

    // Show loading state while checking authentication
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading"></div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Render the protected content
    return <>{children}</>;
}

function AppContent() {
    const location = useLocation();
    const showHeader = location.pathname !== '/login';

    return (
        <>
            {showHeader && <Header />}
            <main>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <SettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/manual-merge"
                        element={
                            <ProtectedRoute>
                                <ManualMergePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            <ProtectedRoute>
                                <HistoryPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </main>
        </>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
