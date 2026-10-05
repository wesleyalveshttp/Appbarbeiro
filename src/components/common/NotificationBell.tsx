import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, UserCheck, CalendarCheck, MessageSquare } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { NotificationItem } from '../../types';

interface NotificationBellProps {
  organizationId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ organizationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const reloadNotifications = () => {
    setNotifications(StorageService.getNotifications(organizationId));
  };

  useEffect(() => {
    reloadNotifications();
    const unsub = StorageService.getNotifications(organizationId);
    setNotifications(unsub);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [organizationId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsAsRead(organizationId);
    reloadNotifications();
  };

  const handleMarkOne = (id: string) => {
    StorageService.markNotificationAsRead(id);
    reloadNotifications();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'CUSTOMER_ARRIVED':
        return <UserCheck className="h-4 w-4 text-emerald-400" />;
      case 'QUEUE_JOIN':
      case 'QUEUE_NEXT':
      case 'QUEUE_CALLED':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'NEW_APPOINTMENT':
        return <CalendarCheck className="h-4 w-4 text-blue-400" />;
      case 'REVIEW':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 ring-2 ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-white">Notificações</h4>
              {unreadCount > 0 && (
                <span className="text-xs text-amber-400 font-mono">({unreadCount} novas)</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhuma notificação no momento.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkOne(n.id)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-800/40 cursor-pointer transition ${
                    !n.isRead ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-amber-300' : 'text-slate-200'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
