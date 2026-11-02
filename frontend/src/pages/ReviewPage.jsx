import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Loader2, Shield, User, MessageSquare, Send } from 'lucide-react';

export default function ReviewPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 0,
    comment: '',
    clarity: 0,
    patience: 0,
    knowledge: 0,
    punctuality: 0
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          sessionId,
          rating: form.rating,
          comment: form.comment,
          categories: {
            clarity: form.clarity,
            patience: form.patience,
            knowledge: form.knowledge,
            punctuality: form.punctuality
          }
        })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      navigate(`/sessions/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">{error || 'Session not found'}</h3>
        <Link to="/sessions" className="text-purple-600 hover:underline mt-2 inline-block">Back to sessions</Link>
      </div>
    );
  }

  const canReview = session.status === 'completed' && session.requester._id === JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;

  if (!canReview) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Cannot review this session</h3>
        <p className="text-gray-500 mt-1">Reviews can only be written by the learner after session completion</p>
        <Link to={`/sessions/${sessionId}`} className="text-purple-600 hover:underline mt-2 inline-block">Back to session</Link>
      </div>
    );
  }

  const provider = session.provider;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to={`/sessions/${sessionId}`} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to session
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-2xl">{provider.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Review {provider.name}</h1>
              <p className="text-gray-500">Session: {session.skill} • {new Date(session.scheduledAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Overall Rating</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className="p-1"
                >
                  <Star
                    className="w-8 h-8"
                    fill={star <= form.rating ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ color: star <= form.rating ? '#fbbf24' : '#d1d5db' }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'clarity', label: 'Clarity' },
              { key: 'patience', label: 'Patience' },
              { key: 'knowledge', label: 'Knowledge' },
              { key: 'punctuality', label: 'Punctuality' }
            ].map(cat => (
              <div key={cat.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{cat.label}</label>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, [cat.key]: star })}
                      className="p-0.5"
                    >
                      <Star
                        className="w-6 h-6"
                        fill={star <= form[cat.key] ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={2}
                        style={{ color: star <= form[cat.key] ? '#fbbf24' : '#d1d5db' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
            <textarea
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="Share your experience..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Link to={`/sessions/${sessionId}`} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !form.rating}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}