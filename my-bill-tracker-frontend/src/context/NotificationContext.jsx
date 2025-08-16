// my-bill-tracker-frontend/src/context/NotificationContext.jsx
import React, { createContext, useState, useContext } from 'react';

// Create a new context for notifications
export const NotificationContext = createContext(null);

// Notification Provider component
export const NotificationProvider = ({ children }) => {
  // State to hold an array of notification objects
  // Each object will have { id: string, message: string, type: 'success' | 'error' }
  const [notifications, setNotifications] = useState([]);

  /**
   * Adds a new notification to the stack.
   * @param {string} message - The message content for the notification.
   * @param {'success' | 'error'} type - The type of notification (for styling).
   */
  const addNotification = (message, type = 'success') => {
    const id = Date.now().toString(); // Simple unique ID for each notification
    setNotifications((prevNotifications) => [
      ...prevNotifications,
      { id, message, type },
    ]);
  };

  /**
   * Removes a notification from the stack by its ID.
   * @param {string} id - The unique ID of the notification to remove.
   */
  const removeNotification = (id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  };

  /**
   * Clears all active notifications.
   */
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications, // Expose function to clear all notifications
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
