"use client";

import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50)); // Keep last 50
    
    // Also trigger a toast
    const options = { description: notif.message };
    if (notif.type === 'success') toast.success(notif.title, options);
    else if (notif.type === 'warning') toast.warning(notif.title, options);
    else if (notif.type === 'error') toast.error(notif.title, options);
    else toast.info(notif.title, options);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
