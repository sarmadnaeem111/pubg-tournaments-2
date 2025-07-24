import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSecureLocalStorage, secureLocalStorage } from '../../utils/security';

function ProtectedRoute({ children, requireAdmin }) {
  const { currentUser, userRole, loading, logout } = useAuth();

  // Track user activity for session management
  useEffect(() => {
    if (currentUser) {
      // Update last activity timestamp
      const now = new Date().getTime();
      secureLocalStorage('lastActivity', now);
      
      // Set up activity tracking
      const trackActivity = () => {
        secureLocalStorage('lastActivity', new Date().getTime());
      };
      
      // Add event listeners for user activity
      window.addEventListener('mousemove', trackActivity);
      window.addEventListener('keypress', trackActivity);
      window.addEventListener('click', trackActivity);
      window.addEventListener('scroll', trackActivity);
      
      return () => {
        // Clean up event listeners
        window.removeEventListener('mousemove', trackActivity);
        window.removeEventListener('keypress', trackActivity);
        window.removeEventListener('click', trackActivity);
        window.removeEventListener('scroll', trackActivity);
      };
    }
  }, [currentUser]);
  
  // Check for session timeout
  useEffect(() => {
    if (currentUser) {
      const checkSessionTimeout = () => {
        const lastActivity = getSecureLocalStorage('lastActivity');
        const now = new Date().getTime();
        
        // Get timeout from env or use default (15 minutes)
        const timeoutMinutes = process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || 15;
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        if (lastActivity && now - lastActivity > timeoutMs) {
          // Session expired, log out user
          logout();
          alert('Your session has expired due to inactivity. Please log in again.');
        }
      };
      
      // Check session timeout every minute
      const sessionInterval = setInterval(checkSessionTimeout, 60000);
      return () => clearInterval(sessionInterval);
    }
  }, [currentUser, logout]);

  // If still loading auth state, show nothing
  if (loading) {
    return <div className="d-flex justify-content-center p-5">Loading...</div>;
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If admin route but user is not admin, redirect to home
  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/" />;
  }
  
  // Otherwise, render the protected component
  return children;
}

export default ProtectedRoute;