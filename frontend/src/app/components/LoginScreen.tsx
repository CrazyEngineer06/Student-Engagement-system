import { useState } from 'react';
import { AuthUser } from '@/app/types';
import { api } from '@/app/api';
import { Lock, Mail, User, GraduationCap, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState('2nd Year');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Name is required');
          setIsLoading(false);
          return;
        }
        const data = await api.register(name, email, password, year);
        api.setToken(data.token);
        onLogin(data.user);
      } else {
        const data = await api.login(email, password);
        api.setToken(data.token);
        onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg shadow-blue-200">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-3xl text-gray-900 mb-2 font-bold">Student Engagement</h1>
          <p className="text-gray-500">Track your points and achievements</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
          {/* Mode Toggle (Login / Register) */}
          {role === 'student' && (
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2.5 rounded-md transition-all text-sm font-medium ${
                  mode === 'login'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`flex-1 py-2.5 rounded-md transition-all text-sm font-medium ${
                  mode === 'register'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Role Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              className={`flex-1 py-2.5 rounded-md transition-all text-sm font-medium ${
                role === 'student'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-md transition-all text-sm font-medium ${
                role === 'admin'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {mode === 'register' && role === 'student' && (
              <div>
                <label htmlFor="name" className="block text-sm text-gray-700 mb-1.5 font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Piyush Kumar"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 mb-1.5 font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'admin@college.edu' : 'you@college.edu'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-700 mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Year field (register only) */}
            {mode === 'register' && role === 'student' && (
              <div>
                <label htmlFor="year" className="block text-sm text-gray-700 mb-1.5 font-medium">
                  Year
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white appearance-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
                </span>
              ) : (
                mode === 'register' ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
            {role === 'admin' ? (
              <p>Admin login: admin@college.edu / admin123</p>
            ) : (
              <>
                <p>Existing students: (name)@college.edu / student123</p>
                <p>e.g., piyush@college.edu / student123</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
