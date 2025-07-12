//2. This is the main application file, where we'll set up the routing for different pages.
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BillOrganizationForm from './pages/BillOrganizationForm.jsx';
import RecordPaymentForm from './pages/RecordPaymentForm.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css'; // Application-specific styles

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-organization" element={<BillOrganizationForm />} />
            <Route path="/edit-organization/:id" element={<BillOrganizationForm />} /> {/* For editing */}
            <Route path="/record-payment" element={<RecordPaymentForm />} />
            <Route path="/record-payment/:organizationId" element={<RecordPaymentForm />} /> {/* Optional: pre-select org */}
            <Route path="*" element={<NotFound />} /> {/* Catch-all for undefined routes */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;