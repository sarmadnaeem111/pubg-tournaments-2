import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Container is removed as it's not being used
import { HelmetProvider, Helmet } from 'react-helmet-async';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Services
import TournamentStatusService from './services/TournamentStatusService';

// Auth Components
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/auth/Login';
import SignUp from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';
import EmailVerificationHelp from './components/auth/EmailVerificationHelp';
import PrivateRoute from './components/auth/ProtectedRoute';

// Common Components
import NavigationBar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './components/common/HomePage';

// User Components
import TournamentList from './components/user/TournamentList';
import MyTournaments from './components/user/MyTournaments';
import UserProfile from './components/user/UserProfile';
import TournamentDetails from './components/user/TournamentDetails';
import WithdrawalHistory from './components/user/WithdrawalHistory';
import RechargeHistory from './components/user/RechargeHistory';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import TournamentManagement from './components/admin/TournamentManagement';
import UserManagement from './components/admin/UserManagement';
import WithdrawalManagement from './components/admin/WithdrawalManagement';
import RechargeManagement from './components/admin/RechargeManagement';
import Reports from './components/admin/Reports';
import PaymentSettings from './components/admin/PaymentSettings';

function App() {
  // Set up polling to check tournament statuses every minute
  useEffect(() => {
    // Initial check
    TournamentStatusService.checkAndUpdateTournamentStatuses();
    
    // Set up interval for checking tournament statuses
    const statusCheckInterval = setInterval(() => {
      TournamentStatusService.checkAndUpdateTournamentStatuses();
    }, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(statusCheckInterval);
  }, []);
  
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <div className="d-flex flex-column min-vh-100">
            <Helmet>
              {/* Security headers */}
              {/* Content-Security-Policy moved to index.html to avoid conflicts */}
              <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
              {/* X-Frame-Options removed as it can only be set via HTTP headers, not meta tags */}
              <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
              <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
              <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
            </Helmet>
            <NavigationBar />
            <div className="flex-grow-1">
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/email-verification-help" element={<EmailVerificationHelp />} />
              <Route path="/tournaments" element={<TournamentList />} />
              <Route path="/tournaments/:tournamentId" element={<TournamentDetails />} />
              
              {/* Protected User Routes */}
              <Route 
                path="/my-tournaments" 
                element={
                  <PrivateRoute>
                    <MyTournaments />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <UserProfile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/withdrawal-history" 
                element={
                  <PrivateRoute>
                    <WithdrawalHistory />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/recharge-history" 
                element={
                  <PrivateRoute>
                    <RechargeHistory />
                  </PrivateRoute>
                } 
              />
              
              {/* Protected Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/tournaments" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <TournamentManagement />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <UserManagement />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/withdrawals" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <WithdrawalManagement />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/recharges" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <RechargeManagement />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/reports" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <Reports />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin/payment-settings" 
                element={
                  <PrivateRoute requireAdmin={true}>
                    <PaymentSettings />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
    </HelmetProvider>
  );
}

export default App;
