// src/context/NotificationContext.jsx
import React, { createContext, useContext } from "react";
import { useNotifications } from "../hooks/useNotifications";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const notificationData = useNotifications();

  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return context;
};
