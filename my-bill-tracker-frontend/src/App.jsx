import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BillOrganizationForm from './pages/BillOrganizationForm.jsx';
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import AddBillForm from './pages/AddBillForm.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import UserProfile from './pages/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import config from './config'; // Import config for SSE URL
import './App.css';

// Component to display temporary toast messages
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
  const textColor = 'text-white';

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Toast disappears after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${bgColor} ${textColor} z-50`}>
      {message}
      <button onClick={onClose} className="ml-4 font-bold">X</button>
    </div>
  );
};

// NEW: NotificationListener component for Server-Sent Events
const NotificationListener = () => {
  const { isAuthenticated, token: authToken } = useAuth();
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  useEffect(() => {
    let eventSource;

    if (isAuthenticated && authToken && config.NOTIFICATION_SSE_BASE_URL) {
      // Pass the JWT token in the query parameter for authentication
      // Note: EventSource doesn't support custom headers directly, so query param is common.
      eventSource = new EventSource(`${config.NOTIFICATION_SSE_BASE_URL}/api/notifications/stream?token=${authToken}`);

      eventSource.onopen = () => {
        console.log('SSE connection opened.');
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received SSE:', data);
        // Display the in-app alert
        setToastMessage(data.message);
        setToastType(data.type === 'error' ? 'error' : 'success'); // Assuming backend sends a 'type'
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setToastMessage('Lost connection to notifications. Please refresh or check backend.');
        setToastType('error');
        eventSource.close();
      };
    } else if (!isAuthenticated && eventSource) {
      // Close connection if user logs out
      eventSource.close();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('SSE connection closed on component unmount/re-render.');
      }
    };
  }, [isAuthenticated, authToken, config.NOTIFICATION_SSE_BASE_URL]);

  return (
    <>
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
};


// ProtectedRoute component to guard routes based on authentication status
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Show a loading indicator while authentication status is being determined
    return <div className="app-loading">Loading application...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }
  // Render children (the protected component) if authenticated
  return children;
};

// Main application content, wrapped in AuthProvider and Router
function AppContent() {
  return (
    <>
      <Header /> {/* Your common Header component */}
      <main className="content">
        <Routes>
          {/* Public Routes - Accessible without authentication */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - Require authentication */}
          {/* The root path, showing the Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Route for adding a new organization */}
          <Route
            path="/add-organization"
            element={
              <ProtectedRoute>
                <BillOrganizationForm />
              </ProtectedRoute>
            }
          />
          {/* Route for editing an existing organization, with a dynamic ID parameter */}
          <Route
            path="/edit-organization/:id"
            element={
              <ProtectedRoute>
                <BillOrganizationForm />
              </ProtectedRoute>
            }
          />
          {/* Route for adding a new bill */}
          <Route
            path="/add-bill"
            element={
              <ProtectedRoute>
                <AddBillForm />
              </ProtectedRoute>
            }
          />
          {/* Route for recording a payment */}
          <Route
            path="/record-payment"
            element={
              <ProtectedRoute>
                <RecordPaymentForm />
              </ProtectedRoute>
            }
          />
          {/* Combined User Settings Route (UserProfile handles all settings) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          {/* Catch-all route for any undefined paths, leading to a NotFound page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <NotificationListener /> {/* Global Notification Listener */}
    </>
  );
}

// Top-level App component wrapping everything in Router and AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <AppContent />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
