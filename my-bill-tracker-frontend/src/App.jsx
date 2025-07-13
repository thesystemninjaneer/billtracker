//2. This is the main application file, where we'll set up the routing for different pages.
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BillOrganizationForm from './pages/BillOrganizationForm.jsx';
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import Register from './pages/Register.jsx'; // New
import Login from './pages/Login.jsx';     // New
import NotFound from './pages/NotFound.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx'; // New: AuthProvider and useAuth hook
import './App.css';

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Loading application...</div>; // Simple loading indicator
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};


function AppContent() {
  return (
    <>
      <Header />
      <main className="content">
        <Routes>
          {/* Public Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-organization"
            element={
              <ProtectedRoute>
                <BillOrganizationForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-organization/:id"
            element={
              <ProtectedRoute>
                <BillOrganizationForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/record-payment"
            element={
              <ProtectedRoute>
                <RecordPaymentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/record-payment/:organizationId"
            element={
              <ProtectedRoute>
                <RecordPaymentForm />
              </ProtectedRoute>
            }
          />

          {/* Catch-all for undefined routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider> {/* Wrap the entire app content with AuthProvider */}
        <div className="app-container">
          <AppContent />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;