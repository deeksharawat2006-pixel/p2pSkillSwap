import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, Clock, Building2, GraduationCap, BookOpen, TrendingUp, ArrowLeft, MessageSquare, Video, Users, Loader2, AlertCircle } from 'lucide-react';

export default function PeerProfile() {
  const { id } = useParams();
  const [peer, setPeer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/peers/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setPeer(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  const handleStartSession = async () => {
    if (!peer.skillsToTeach?.length) return;
    
    setSessionLoading(true);
    try {
      const skill = peer.skillsToTeach[0].name;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          providerId: peer._id,
          skill,
          scheduledAt: tomorrow.toISOString(),
          duration: 60,
          credits: 10,
          notes: `Requested to learn ${skill}`
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create session');
      }
      
      const session = await res.json();
      window.location.href = `/sessions/${session._id}`;
    } catch (err) {
      alert(err.message || 'Failed to start session');
    } finally {
      setSessionLoading(false);
    }
  };

  if (!peer) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">User not found</h3>
        <Link to="/matches" className="text-purple-600 hover:underline mt-2 inline-block">Back to matches</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to matches
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-2xl">{peer.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{peer.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-500 text-sm">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{peer.college}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" />{peer.branch}</span>
                <span>Year {peer.year}</span>
              </div>
              {peer.bio && <p className="mt-3 text-gray-600">{peer.bio}</p>}
            </div>
            <div className="flex items-center gap-2">
              {peer.avgRating > 0 && (
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{peer.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-yellow-600">({peer.reviewCount})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Skills I Can Teach
          </h2>
          {peer.skillsToTeach?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {peer.skillsToTeach.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                  {skill.name}
                  <span className="text-xs bg-blue-100 px-1.5 rounded">L{skill.proficiency}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No teaching skills listed</p>
          )}
        </div>

        <div className="border-t border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Skills I Want to Learn
          </h2>
          {peer.skillsToLearn?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {peer.skillsToLearn.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1">
                  {skill.name}
                  <span className="text-xs bg-green-100 px-1.5 rounded">Target L{skill.targetProficiency}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No learning skills listed</p>
          )}
        </div>

        <div className="border-t border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Weekly Availability
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-2 font-medium">Day</th>
                  {['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map(slot => (
                    <th key={slot} className="p-2 text-center font-medium">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const dayAvail = peer.availability?.find(d => d.day === day);
                  const slots = dayAvail?.slots || [];
                  return (
                    <tr key={day} className="border-t border-gray-100">
                      <td className="p-2 font-medium text-gray-700">{day}</td>
                      {['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'].map(slot => (
                        <td key={slot} className="p-2 text-center">
                          <span className={`w-full h-8 rounded flex items-center justify-center ${
                            slots.includes(slot) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {slots.includes(slot) ? '✓' : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Message
        </button>
        <button
          onClick={handleStartSession}
          disabled={sessionLoading || !peer.skillsToTeach?.length}
          className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sessionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
          {sessionLoading ? 'Requesting...' : 'Start Session'}
        </button>
      </div>
    </div>
  );
}