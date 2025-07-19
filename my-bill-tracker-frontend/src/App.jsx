import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BillOrganizationForm from './pages/BillOrganizationForm.jsx';
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import AddBillForm from './pages/AddBillForm.jsx'; // New import
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.ejs';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './App.css';

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
            path="/add-bill"
            element={
              <ProtectedRoute>
                <AddBillForm />
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
          {/* Note: /record-payment/:organizationId is handled by the query params on /record-payment now */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
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
      <AuthProvider>
        <div className="app-container">
          <AppContent />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;