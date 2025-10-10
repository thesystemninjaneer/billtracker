// my-bill-tracker-frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
// Corrected the import name to match the exported component's new functionality
import OrganizationsPage from './pages/BillOrganizationForm.jsx'; 
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import AddBillForm from './pages/AddBillForm.jsx';
import EditBillListPage from './pages/EditBillListPage.jsx';
import EditBillForm from './pages/EditBillForm.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import UserProfile from './pages/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.jsx';
import config from './config';
import './App.css';

// Individual Toast Item Component
const ToastItem = ({ id, message, type, onClose }) => {
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
  const textColor = 'text-white';
  const borderColor = type === 'error' ? 'border-red-800' : 'border-green-800';

  return (
    <div className={`relative p-4 rounded-lg shadow-md border-2 ${borderColor} ${bgColor} ${textColor} mb-2`}>
      <p className="font-semibold text-base pr-8">{message}</p> {/* Added padding-right for close button */}
      <button onClick={() => onClose(id)} className="absolute top-2 right-3 text-white hover:text-gray-200 text-lg font-bold">X</button>
    </div>
  );
};

// Container for all Toast messages
const NotificationsContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end max-w-sm w-full">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};


// NotificationListener component
const NotificationListener = () => {
  const { isAuthenticated, token: authToken } = useAuth();
  const { addNotification } = useNotification(); // Get addNotification from NotificationContext

useEffect(() => {
    let eventSource;

    // Only establish SSE connection if authenticated
    if (isAuthenticated && authToken && config.NOTIFICATION_SSE_BASE_URL) {
      // Construct the full path from the gateway base URL
      const streamUrl = `${config.NOTIFICATION_SSE_BASE_URL}/notifications/stream?token=${authToken}`;

      eventSource = new EventSource(streamUrl)

      eventSource.onopen = () => {
        console.log('SSE connection opened.');
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received SSE:', data);
        // Only add notification if authenticated (double check)
        if (isAuthenticated) {
          addNotification(data.message, data.type); // Use addNotification
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        // Only show error notification if still authenticated
        if (isAuthenticated) {
            addNotification('Lost connection to notifications. Please refresh or check backend.', 'error');
        }
        eventSource.close();
      };
    } else if (!isAuthenticated && eventSource) {
      // Close connection if user logs out or is not authenticated
      eventSource.close();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('SSE connection closed on component unmount/re-render.');
      }
    };
  }, [isAuthenticated, authToken, config.NOTIFICATION_SSE_BASE_URL, addNotification]);

  return null; // This component does not render anything directly
};


// ProtectedRoute component to guard routes based on authentication status
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Loading application...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Main application content, wrapped in AuthProvider and Router
function AppContent() {
  return (
    <>
      <Header />
      <main className="content">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* UPDATED: Simplified routes for Organizations, using the correct component */}
          <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
          <Route path="/organizations/:id" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />

          <Route path="/add-bill" element={<ProtectedRoute><AddBillForm /></ProtectedRoute>} />
          <Route path="/edit-bills" element={<ProtectedRoute><EditBillListPage /></ProtectedRoute>} />
          <Route path="/edit-bill/:id" element={<ProtectedRoute><EditBillForm /></ProtectedRoute>} />
          <Route path="/record-payment" element={<ProtectedRoute><RecordPaymentForm /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <NotificationListener /> {/* NotificationListener is still here to listen for SSEs */}
      <NotificationsContainer /> {/* Render the container for stacked notifications */}
    </>
  );
}

// Top-level App component wrapping everything in Router and AuthProvider
function App() {
  return (
    <Router>
      {/* NotificationProvider wraps AuthProvider */}
      <NotificationProvider>
        <AuthProvider>
          <div className="app-container">
            <AppContent />
          </div>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;

