import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Matches from './pages/Matches';
import PeerProfile from './pages/PeerProfile';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import StudyRoom from './pages/StudyRoom';
import Notifications from './pages/Notifications';
import ReviewPage from './pages/ReviewPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/peer/:id" element={<PeerProfile />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/study-room/:sessionId" element={<StudyRoom />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/sessions/:sessionId/review" element={<ReviewPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;