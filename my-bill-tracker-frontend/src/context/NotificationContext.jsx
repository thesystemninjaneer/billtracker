import React, { createContext, useState, useContext } from 'react';

// Create a new context for notifications
export const NotificationContext = createContext(null);

// Notification Provider component
export const NotificationProvider = ({ children }) => {
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  const contextValue = {
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the NotificationContext
export const useNotification = () => {
  return useContext(NotificationContext);
};
