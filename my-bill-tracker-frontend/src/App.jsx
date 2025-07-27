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
import { NotificationProvider, useNotification } from './context/NotificationContext.jsx';
import config from './config';
import './App.css';

// Component to display temporary toast messages
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
  const textColor = 'text-white';
  const borderColor = type === 'error' ? 'border-red-800' : 'border-green-800';

  return (
    <div className={`fixed bottom-8 right-8 p-6 rounded-lg shadow-xl border-2 ${borderColor} ${bgColor} ${textColor} z-[100]`}>
      <p className="font-semibold text-lg">{message}</p>
      <button onClick={onClose} className="absolute top-2 right-3 text-white hover:text-gray-200 text-xl font-bold">X</button>
    </div>
  );
};

// NotificationListener component (now only listens and updates global state)
const NotificationListener = () => {
  const { isAuthenticated, token: authToken } = useAuth(); // Still need auth for SSE connection
  const { setToastMessage, setToastType } = useNotification(); // NEW: Get setters from NotificationContext

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
        // Update global toast state via NotificationContext
        setToastMessage(data.message);
        setToastType(data.type === 'error' ? 'error' : 'success');
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
  }, [isAuthenticated, authToken, config.NOTIFICATION_SSE_BASE_URL, setToastMessage, setToastType]);

  // This component no longer renders the Toast directly
  return null;
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
  const { toastMessage, toastType, setToastMessage, setToastType } = useNotification(); // NEW: Get toast state from NotificationContext

  const handleCloseToast = () => {
    setToastMessage(null);
    setToastType('success'); // Reset type to default
  };

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
      <NotificationListener /> {/* NotificationListener is still here to listen for SSEs */}

      {/* Toast is rendered globally based on NotificationContext state */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={handleCloseToast}
        />
      )}
    </>
  );
}

// Top-level App component wrapping everything in Router and AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        {/* NEW: Wrap AppContent with NotificationProvider */}
        <NotificationProvider>
          <div className="app-container">
            <AppContent />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
