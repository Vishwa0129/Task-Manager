import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('taskflow_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('taskflow_user');
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email, password) => {
    // Mock authentication - replace with real auth
    const mockUser = {
      id: 'user_' + Date.now(),
      email,
      name: email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString()
    };
    
    setUser(mockUser);
    localStorage.setItem('taskflow_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const signUp = async (email, password, name) => {
    // Mock registration - replace with real auth
    const mockUser = {
      id: 'user_' + Date.now(),
      email,
      name: name || email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString()
    };
    
    setUser(mockUser);
    localStorage.setItem('taskflow_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('taskflow_user');
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
