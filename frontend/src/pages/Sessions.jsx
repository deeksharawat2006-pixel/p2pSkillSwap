import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Star, X, Check, RotateCcw, AlertTriangle, Loader2, Filter } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  rescheduled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
  completed: 'bg-purple-100 text-purple-700'
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Confirmed',
  declined: 'Declined',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  completed: 'Completed'
};

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [activeTab]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      const res = await fetch(`/api/sessions?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSessions(data.sessions || data);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (sessionId, action, data = {}) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Action failed');
      fetchSessions();
    } catch (err) {
      setError('Action failed');
    }
  };

  const getRole = (session) => {
    const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;
    return session.requester._id === userId ? 'requester' : 'provider';
  };

  const canAct = (session, action) => {
    const role = getRole(session);
    const status = session.status;
    if (action === 'accept' || action === 'decline') return role === 'provider' && status === 'pending';
    if (action === 'reschedule') return (role === 'requester' || role === 'provider') && ['pending', 'accepted', 'rescheduled'].includes(status);
    if (action === 'cancel') return (role === 'requester' || role === 'provider') && !['completed', 'cancelled'].includes(status);
    if (action === 'complete') return role === 'provider' && ['accepted', 'rescheduled'].includes(status);
    if (action === 'join') return ['accepted', 'rescheduled'].includes(status) && new Date(session.scheduledAt) <= new Date(Date.now() + 15 * 60000);
    return false;
  };

  const SessionCard = ({ session }) => {
    const role = getRole(session);
    const other = role === 'requester' ? session.provider : session.requester;
    const isUpcoming = ['accepted', 'rescheduled'].includes(session.status) && new Date(session.scheduledAt) > new Date();

    return (
      <Link to={`/sessions/${session._id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-bold text-lg">{other.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-800 truncate">{session.skill}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[session.status]}`}>
                {STATUS_LABELS[session.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {role === 'requester' ? 'Learning from' : 'Teaching'} {other.name} • {other.college} • {other.branch}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(session.scheduledAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {session.duration} min
              </span>
            </div>
          </div>
          {isUpcoming && (
            <div className="flex items-center gap-2">
              <Link to={`/study-room/${session._id}`} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                <Video className="w-4 h-4 inline mr-1" /> Join
              </Link>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {canAct(session, 'accept') && (
            <button onClick={(e) => { e.preventDefault(); handleAction(session._id, 'accept'); }} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">Accept</button>
          )}
          {canAct(session, 'decline') && (
            <button onClick={(e) => { e.preventDefault(); handleAction(session._id, 'decline'); }} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700">Decline</button>
          )}
          {canAct(session, 'reschedule') && (
            <button onClick={(e) => { e.preventDefault(); handleReschedule(session); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Reschedule</button>
          )}
          {canAct(session, 'cancel') && (
            <button onClick={(e) => { e.preventDefault(); handleCancel(session); }} className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
          )}
          {canAct(session, 'complete') && (
            <button onClick={(e) => { e.preventDefault(); handleAction(session._id, 'complete'); }} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">Complete</button>
          )}
          {session.status === 'completed' && (
            <Link to={`/sessions/${session._id}/review`} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Review</Link>
          )}
        </div>
      </Link>
    );
  };

  const handleReschedule = (session) => {
    const newTime = prompt('Enter new date/time (YYYY-MM-DDTHH:MM):', new Date(session.scheduledAt).toISOString().slice(0, 16));
    if (newTime) {
      const reason = prompt('Reason for rescheduling:') || '';
      handleAction(session._id, 'reschedule', { scheduledAt: newTime, reason });
    }
  };

  const handleCancel = (session) => {
    const reason = prompt('Reason for cancellation:') || '';
    if (reason) handleAction(session._id, 'cancel', { reason });
  };

  const tabs = ['all', 'pending', 'accepted', 'rescheduled', 'completed', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Sessions</h1>
          <p className="text-gray-500">Manage your learning sessions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex overflow-x-auto gap-1 pb-1" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              role="tab"
              aria-selected={activeTab === tab}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No sessions found</h3>
          <p className="text-gray-500 mt-1">
            {activeTab === 'all' ? 'Book a session with a peer to get started' : `No ${activeTab} sessions`}
          </p>
          <Link to="/matches" className="inline-flex items-center gap-2 mt-4 text-purple-600 hover:underline">
            <Users className="w-4 h-4" />
            Find Peers
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}