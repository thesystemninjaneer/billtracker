import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BillOrganizationForm from './pages/BillOrganizationForm.jsx';
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import AddBillForm from './pages/AddBillForm.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import NotificationSettings from './pages/NotificationSettings';
import UserProfile from './pages/UserProfile'; // Import the new UserProfile component
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './App.css';

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
          {/* Route for Notification Settings */}
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            }
          />
          {/* NEW: Route for User Profile Settings */}
          <Route
            path="/settings/profile"
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
