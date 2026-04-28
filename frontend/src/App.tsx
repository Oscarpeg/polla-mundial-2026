import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FixturePage } from './pages/FixturePage';
import { BracketPage } from './pages/BracketPage';
import { GlobalPicksPage } from './pages/GlobalPicksPage';
import { PreviewPage } from './pages/PreviewPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ResultsPage } from './pages/ResultsPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';

function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/fixture" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/fixture" element={<FixturePage />} />
          <Route path="/bracket" element={<BracketPage />} />
          <Route path="/global-picks" element={<GlobalPicksPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Route>

        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/fixture" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
