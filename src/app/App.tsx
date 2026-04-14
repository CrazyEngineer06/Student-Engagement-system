import { useState, useEffect, useCallback } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthUser } from './types';
import { api } from './api';

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch {
        api.clearToken();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = useCallback((user: AuthUser) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    api.clearToken();
    setCurrentUser(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentUser.role === 'student') {
    return (
      <StudentDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  if (currentUser.role === 'admin') {
    return (
      <AdminDashboard
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default App;
