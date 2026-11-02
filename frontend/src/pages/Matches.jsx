import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, Star, Calendar, Clock, Building2, GraduationCap, Loader2, ArrowRight } from 'lucide-react';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchSkill, setSearchSkill] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [viewMode, setViewMode] = useState('matches');

  useEffect(() => {
    if (viewMode === 'matches') fetchMatches();
    else fetchSearch();
  }, [viewMode, searchSkill, filterCollege, filterBranch]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/peers/matches?limit=20', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchSkill) params.append('skill', searchSkill);
      if (filterCollege) params.append('college', filterCollege);
      if (filterBranch) params.append('branch', filterBranch);
      params.append('limit', '20');
      const res = await fetch(`/api/peers/search?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score) => {
    if (score >= 0.7) return 'text-green-600 bg-green-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const MatchCard = ({ peer }) => (
    <Link to={`/peer/${peer._id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <span className="text-purple-600 font-bold text-lg">{peer.name?.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 truncate">{peer.name}</h3>
            {peer.matchScore && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMatchColor(peer.matchScore)}`}>
                {Math.round(peer.matchScore * 100)}% Match
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{peer.college} • {peer.branch} • Year {peer.year}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {peer.avgRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {peer.avgRating.toFixed(1)} ({peer.reviewCount})
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {peer.skillsToTeach?.length || 0} teaching
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {peer.skillsToLearn?.length || 0} learning
            </span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
      </div>

      {peer.matchingSkills && peer.matchingSkills.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Matching skills:</p>
          <div className="flex flex-wrap gap-1">
            {peer.matchingSkills.slice(0, 5).map(skill => (
              <span key={skill} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">
                {skill}
              </span>
            ))}
            {peer.matchingSkills.length > 5 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                +{peer.matchingSkills.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Find Peers</h1>
          <p className="text-gray-500">Discover compatible learning partners</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('matches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'matches'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" /> Smart Matches
          </button>
          <button
            onClick={() => setViewMode('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'search'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Search className="w-4 h-4 inline mr-1" /> Search
          </button>
        </div>

        {viewMode === 'search' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              value={searchSkill}
              onChange={e => setSearchSkill(e.target.value)}
              placeholder="Search by skill (e.g., Python)..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <input
              type="text"
              value={filterCollege}
              onChange={e => setFilterCollege(e.target.value)}
              placeholder="Filter by college"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <input
              type="text"
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              placeholder="Filter by branch"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No peers found</h3>
          <p className="text-gray-500 mt-1">
            {viewMode === 'matches'
              ? 'Complete your profile with skills to get better matches'
              : 'Try adjusting your search filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(peer => (
            <MatchCard key={peer._id} peer={peer} />
          ))}
        </div>
      )}
    </div>
  );
}