import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores user info from JWT payload
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true); // To check initial token validity
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          // Attempt to fetch profile to verify token validity
          const response = await fetch(`${config.USER_API_BASE_URL}/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            console.error("Token verification failed or expired.");
            logout(); // Log out if token is invalid or expired
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]); // Re-run if token changes

  const login = async (username, password) => {
    try {
      const response = await fetch(`${config.USER_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/'); // Redirect to dashboard on successful login
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${config.USER_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed.');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/'); // Redirect to dashboard on successful registration
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login'); // Redirect to login page on logout
  };

  const authAxios = async (url, options = {}) => {
    const headers = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      // If unauthorized/forbidden, token might be expired or invalid
      logout();
      throw new Error('Session expired or invalid. Please log in again.');
    }
    return response;
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user, // Simplified check
    loading,
    login,
    register,
    logout,
    authAxios // A wrapper for authenticated fetch requests
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);