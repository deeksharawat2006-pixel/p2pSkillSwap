import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Users, Star, Video, MessageSquare, Check, X, RotateCcw, AlertTriangle, Loader2, Shield } from 'lucide-react';

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

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setSession(data);
    } catch (err) {
      setError('Session not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, data = {}) => {
    try {
      const res = await fetch(`/api/sessions/${id}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Action failed');
      fetchSession();
    } catch (err) {
      setError('Action failed');
    }
  };

  const getRole = () => {
    if (!session) return null;
    const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;
    return session.requester._id === userId ? 'requester' : 'provider';
  };

  const canAct = (action) => {
    if (!session) return false;
    const role = getRole();
    const status = session.status;
    if (action === 'accept' || action === 'decline') return role === 'provider' && status === 'pending';
    if (action === 'reschedule') return (role === 'requester' || role === 'provider') && ['pending', 'accepted', 'rescheduled'].includes(status);
    if (action === 'cancel') return (role === 'requester' || role === 'provider') && !['completed', 'cancelled'].includes(status);
    if (action === 'complete') return role === 'provider' && ['accepted', 'rescheduled'].includes(status);
    if (action === 'join') return ['accepted', 'rescheduled'].includes(status) && new Date(session.scheduledAt) <= new Date(Date.now() + 15 * 60000);
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Session not found</h3>
        <Link to="/sessions" className="text-purple-600 hover:underline mt-2 inline-block">Back to sessions</Link>
      </div>
    );
  }

  const role = getRole();
  const other = role === 'requester' ? session.provider : session.requester;
  const isUpcoming = ['accepted', 'rescheduled'].includes(session.status) && new Date(session.scheduledAt) > new Date();
  const isPast = new Date(session.scheduledAt) < new Date();
  const isLive = ['accepted', 'rescheduled'].includes(session.status) && new Date(session.scheduledAt) <= new Date(Date.now() + 15 * 60000) && new Date(session.scheduledAt) >= new Date(Date.now() - session.duration * 60000);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/sessions" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to sessions
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-2xl">{other.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-800">{session.skill}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[session.status]}`}>
                  {STATUS_LABELS[session.status]}
                </span>
              </div>
              <p className="text-gray-500">
                {role === 'requester' ? 'You are learning from' : 'You are teaching'} <span className="font-medium">{other.name}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" /> Schedule
            </h3>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">Date:</span> {new Date(session.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p><span className="font-medium">Time:</span> {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="font-medium">Duration:</span> {session.duration} minutes</p>
              <p><span className="font-medium">Credits:</span> {session.credits}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Participants
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">{session.requester.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium">{session.requester.name} <span className="text-sm text-gray-500">(Learner)</span></p>
                  <p className="text-sm text-gray-500">{session.requester.college} • {session.requester.branch}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">{session.provider.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium">{session.provider.name} <span className="text-sm text-gray-500">(Teacher)</span></p>
                  <p className="text-sm text-gray-500">{session.provider.college} • {session.provider.branch}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {session.notes && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <h4 className="font-medium text-gray-800 mb-1">Notes</h4>
            <p className="text-gray-600">{session.notes}</p>
          </div>
        )}

        {session.rescheduleHistory && session.rescheduleHistory.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-800 mb-2">Reschedule History</h4>
            <div className="space-y-2">
              {session.rescheduleHistory.map((h, i) => (
                <div key={i} className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  <p>From: {new Date(h.from).toLocaleString()}</p>
                  <p>To: {new Date(h.to).toLocaleString()}</p>
                  {h.reason && <p>Reason: {h.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {session.cancellationReason && (
          <div className="px-6 py-4 border-t border-gray-100 bg-red-50">
            <h4 className="font-medium text-red-800 mb-1">Cancellation Reason</h4>
            <p className="text-red-600">{session.cancellationReason}</p>
          </div>
        )}

        <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3">
          {canAct('accept') && (
            <button onClick={() => handleAction('accept')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Check className="w-4 h-4" /> Accept
            </button>
          )}
          {canAct('decline') && (
            <button onClick={() => handleAction('decline')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
              <X className="w-4 h-4" /> Decline
            </button>
          )}
          {canAct('reschedule') && (
            <button onClick={() => {
              const newTime = prompt('New date/time (YYYY-MM-DDTHH:MM):', new Date(session.scheduledAt).toISOString().slice(0, 16));
              if (newTime) {
                const reason = prompt('Reason:') || '';
                handleAction('reschedule', { scheduledAt: newTime, reason });
              }
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reschedule
            </button>
          )}
          {canAct('cancel') && (
            <button onClick={() => {
              const reason = prompt('Reason for cancellation:') || '';
              if (reason) handleAction('cancel', { reason });
            }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Cancel
            </button>
          )}
          {canAct('complete') && (
            <button onClick={() => handleAction('complete')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <Check className="w-4 h-4" /> Mark Complete
            </button>
          )}
          {canAct('join') && (
            <Link to={`/study-room/${session._id}`} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <Video className="w-4 h-4" /> Join Session
            </Link>
          )}
          {session.status === 'completed' && (
            <Link to={`/sessions/${session._id}/review`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Star className="w-4 h-4" /> Write Review
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}