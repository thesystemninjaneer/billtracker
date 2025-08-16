// my-bill-tracker-frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import { useNotification } from './NotificationContext'; // NEW: Import useNotification

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { clearAllNotifications } = useNotification(); // NEW: Get clearAllNotifications from NotificationContext

  // Logout function (defined early for use in authAxios and useEffect)
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    clearAllNotifications(); // NEW: Clear all notifications on logout
    navigate('/login');
  }, [navigate, clearAllNotifications]); // Add clearAllNotifications to dependency array

  // Custom fetch wrapper that includes the Authorization header
  const authAxios = useCallback(async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': options.headers && options.headers['Content-Type'] ? options.headers['Content-Type'] : 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed or token expired. Logging out.');
        logout();
      }
      return response;
    } catch (error) {
      console.error('Network or fetch error:', error);
      throw error;
    }
  }, [token, logout]);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await authAxios(`${config.USER_API_BASE_URL}/profile`, { method: 'GET' });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            console.error("Token verification failed or expired.");
            logout();
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    verifyToken();
  }, [token, logout, authAxios]);

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
      setIsAuthenticated(true);
      navigate('/');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message };
    }
  };

  // Register function
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
      setIsAuthenticated(true);
      navigate('/');
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message };
    }
  };

  const contextValue = {
    token,
    setToken,
    user,
    setUser,
    isAuthenticated,
    loading,
    authAxios,
    logout,
    login,
    register,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
