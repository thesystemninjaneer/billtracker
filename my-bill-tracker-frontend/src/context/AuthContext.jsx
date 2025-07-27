import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token); // Keep as state for clarity
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  // Logout function (defined early for use in authAxios and useEffect)
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    navigate('/login'); // Redirect to login page on logout
  }, [navigate]);

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
      // If the token is expired or invalid, log out the user
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed or token expired. Logging out.');
        logout(); // Call logout function
      }
      return response;
    } catch (error) {
      console.error('Network or fetch error:', error);
      throw error; // Re-throw to be caught by calling component
    }
  }, [token, logout]); // Depend on token and logout

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          // Attempt to fetch profile to verify token validity
          const response = await authAxios(`${config.USER_API_BASE_URL}/profile`, { method: 'GET' });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            console.error("Token verification failed or expired.");
            logout(); // Log out if token is invalid or expired
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          logout();
        }
      } else {
        setIsAuthenticated(false); // No token, so not authenticated
      }
      setLoading(false);
    };

    verifyToken();
  }, [token, logout, authAxios]); // Re-run if token or authAxios/logout changes

  // Login function
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
      setIsAuthenticated(true); // Set authenticated on successful login
      navigate('/'); // Redirect to dashboard on successful login
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
      setIsAuthenticated(true); // Set authenticated on successful registration
      navigate('/'); // Redirect to dashboard on successful registration
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
    isAuthenticated, // Use the state variable
    loading,
    authAxios,
    logout,
    login, // Expose login function
    register, // Expose register function
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
