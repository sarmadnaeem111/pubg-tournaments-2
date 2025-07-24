import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import DOMPurify from 'dompurify';
import validator from 'validator';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session timeout in milliseconds (15 minutes)
  const SESSION_TIMEOUT = 15 * 60 * 1000;
  const [sessionTimer, setSessionTimer] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Validate email and password
  function validateCredentials(email, password) {
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    if (!validator.isStrongPassword(password, {
      minLength: 8, 
      minLowercase: 1, 
      minUppercase: 1, 
      minNumbers: 1, 
      minSymbols: 1
    })) {
      throw new Error('Password must be at least 8 characters and contain lowercase, uppercase, number, and special character');
    }
    
    return true;
  }

  // Sanitize user inputs
  function sanitizeInput(input) {
    if (typeof input === 'string') {
      return DOMPurify.sanitize(input.trim());
    }
    return input;
  }

  async function signup(email, password) {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    
    // Validate credentials
    validateCredentials(sanitizedEmail, password);
    
    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: sanitizedEmail,
      role: 'user',
      walletBalance: 0,
      joinedTournaments: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accountLocked: false,
      loginAttempts: 0
    });

    return userCredential;
  }

  async function login(email, password) {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    
    // Check if account is locked
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", sanitizedEmail));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      
      if (userData.accountLocked) {
        throw new Error('Account is locked due to too many failed login attempts. Please reset your password.');
      }
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
        
        // Reset login attempts on successful login
        await setDoc(doc(db, 'users', userId), {
          ...userData,
          loginAttempts: 0,
          lastLogin: new Date().toISOString()
        }, { merge: true });
        
        // Start session timer
        resetSessionTimer();
        
        return userCredential;
      } catch (error) {
        // Increment login attempts on failed login
        const newAttempts = (userData.loginAttempts || 0) + 1;
        const shouldLock = newAttempts >= 5; // Lock after 5 failed attempts
        
        await setDoc(doc(db, 'users', userId), {
          ...userData,
          loginAttempts: newAttempts,
          accountLocked: shouldLock
        }, { merge: true });
        
        if (shouldLock) {
          throw new Error('Account locked due to too many failed login attempts. Please reset your password.');
        }
        
        throw error;
      }
    } else {
      // Proceed with login attempt even if user not found in Firestore
      // This prevents user enumeration attacks
      return signInWithEmailAndPassword(auth, sanitizedEmail, password);
    }
  }
  
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      // Add scopes for additional user info if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters for better security
      provider.setCustomParameters({
        'prompt': 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user or existing user
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create a new user document in Firestore
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          role: 'user',
          walletBalance: 0,
          joinedTournaments: [],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          accountLocked: false,
          loginAttempts: 0,
          authProvider: 'google'
        });
      } else {
        // Update existing user's last login
        await setDoc(userRef, {
          lastLogin: new Date().toISOString(),
          loginAttempts: 0,
          accountLocked: false,
          // Update these fields if they might have changed in Google profile
          displayName: result.user.displayName || userSnap.data().displayName || '',
          photoURL: result.user.photoURL || userSnap.data().photoURL || ''
        }, { merge: true });
      }
      
      // Start session timer
      resetSessionTimer();
      
      return result;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }
  
  async function resetPassword(email) {
    const sanitizedEmail = sanitizeInput(email);
    
    // Configure actionCodeSettings for better email deliverability
    const actionCodeSettings = {
      // URL you want to redirect back to after password reset
      url: window.location.origin + '/login',
      // This must be true for password reset emails
      handleCodeInApp: false
    };
    
    return sendPasswordResetEmail(auth, sanitizedEmail, actionCodeSettings);
  }
  
  async function updateUserEmail(newEmail) {
    if (!currentUser) throw new Error('No user logged in');
    
    const sanitizedEmail = sanitizeInput(newEmail);
    if (!validator.isEmail(sanitizedEmail)) {
      throw new Error('Invalid email format');
    }
    
    return updateEmail(currentUser, sanitizedEmail);
  }
  
  async function updateUserPassword(newPassword) {
    if (!currentUser) throw new Error('No user logged in');
    
    if (!validator.isStrongPassword(newPassword, {
      minLength: 8, 
      minLowercase: 1, 
      minUppercase: 1, 
      minNumbers: 1, 
      minSymbols: 1
    })) {
      throw new Error('Password must be at least 8 characters and contain lowercase, uppercase, number, and special character');
    }
    
    return updatePassword(currentUser, newPassword);
  }
  
  // Reset session timer
  function resetSessionTimer() {
    setLastActivity(Date.now());
    
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }
    
    const timer = setTimeout(() => {
      // Auto logout after inactivity
      if (Date.now() - lastActivity >= SESSION_TIMEOUT) {
        logout();
      }
    }, SESSION_TIMEOUT);
    
    setSessionTimer(timer);
  }
  
  // Track user activity
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      resetSessionTimer();
    };
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    return () => {
      if (sessionTimer) {
        clearTimeout(sessionTimer);
      }
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [lastActivity, sessionTimer]);

  function logout() {
    return signOut(auth);
  }

  async function getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user data from Firestore
        const userData = await getUserData(user.uid);
        setUserRole(userData?.role || 'user');
        
        // Start session timer
        resetSessionTimer();
      } else {
        setUserRole(null);
        
        // Clear session timer on logout
        if (sessionTimer) {
          clearTimeout(sessionTimer);
          setSessionTimer(null);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Function to send email verification to current user
  async function sendVerificationEmail(user) {
    return sendEmailVerification(user, {
      url: window.location.origin + '/login',
      handleCodeInApp: false
    });
  }

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    loginWithGoogle,
    logout,
    getUserData,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    sanitizeInput,
    sendEmailVerification: sendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}