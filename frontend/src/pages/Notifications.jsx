import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, X, Mail, Check, Loader2, Shield, MessageSquare, Video, Star, RotateCcw, AlertTriangle, Calendar, Clock, Users } from 'lucide-react';

const NOTIFICATION_ICONS = {
  session_request: { icon: Users, color: 'text-blue-500 bg-blue-100' },
  session_accepted: { icon: Check, color: 'text-green-500 bg-green-100' },
  session_declined: { icon: X, color: 'text-red-500 bg-red-100' },
  session_rescheduled: { icon: RotateCcw, color: 'text-yellow-500 bg-yellow-100' },
  session_cancelled: { icon: AlertTriangle, color: 'text-gray-500 bg-gray-100' },
  session_reminder: { icon: Clock, color: 'text-orange-500 bg-orange-100' },
  session_completed: { icon: Shield, color: 'text-purple-500 bg-purple-100' },
  new_message: { icon: MessageSquare, color: 'text-indigo-500 bg-indigo-100' },
  rating_received: { icon: Star, color: 'text-amber-500 bg-amber-100' },
  credit_earned: { icon: Calendar, color: 'text-emerald-500 bg-emerald-100' }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('read', filter === 'unread' ? 'false' : 'true');
      const res = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setNotifications(data.notifications || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getActionUrl = (notification) => {
    if (notification.actionUrl) return notification.actionUrl;
    if (notification.relatedSession) return `/sessions/${notification.relatedSession}`;
    if (notification.relatedUser) return `/peer/${notification.relatedUser}`;
    return '/notifications';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-gray-500">Stay updated on your learning activity</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex gap-1" role="tablist">
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={filter === f}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-gray-500 mt-1">
            {filter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here when you receive session requests, messages, and more'}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {notifications.map(notification => {
            const config = NOTIFICATION_ICONS[notification.type] || { icon: Bell, color: 'text-gray-500 bg-gray-100' };
            const Icon = config.icon;
            const url = getActionUrl(notification);

            return (
              <div
                key={notification._id}
                className={`bg-white border-b border-gray-100 p-4 flex gap-3 transition-colors ${!notification.read ? 'bg-purple-50' : ''} last:border-0`}
                onClick={() => {
                  if (!notification.read) markAsRead(notification._id);
                  if (url !== '/notifications') window.location.href = url;
                }}
              >
                <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-medium text-gray-800 ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notification.createdAt)}</span>
                  </div>
                  {notification.relatedSession && (
                    <Link
                      to={`/sessions/${notification.relatedSession}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <Calendar className="w-3 h-3" />
                      View Session
                    </Link>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}