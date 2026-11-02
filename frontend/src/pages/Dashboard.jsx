import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Star, Clock, TrendingUp, ArrowRight } from 'lucide-react';

const stats = [
  { label: 'Teaching Skills', value: 3, icon: BookOpen, color: 'text-blue-600 bg-blue-100' },
  { label: 'Learning Skills', value: 2, icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  { label: 'Matches Found', value: 5, icon: Users, color: 'text-purple-600 bg-purple-100' },
  { label: 'Sessions This Month', value: 2, icon: Clock, color: 'text-orange-600 bg-orange-100' },
];

const quickActions = [
  { label: 'Find Peers', path: '/matches', icon: Users, description: 'Discover compatible learning partners' },
  { label: 'Update Profile', path: '/profile', icon: BookOpen, description: 'Add skills, availability, bio' },
];

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const teachingCount = user.skillsToTeach?.length || 0;
  const learningCount = user.skillsToLearn?.length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user.name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">Here's your learning overview</p>
        </div>
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Find Peers
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const actualValue = i === 0 ? teachingCount : i === 1 ? learningCount : stat.value;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{actualValue}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={i}
                to={action.path}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{action.label}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRight className="ml-auto w-5 h-5 text-gray-400" />
              </Link>
            );
          })}
        </div>
      </div>

      {(teachingCount === 0 || learningCount === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Complete your profile</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {teachingCount === 0 && 'Add skills you can teach to help others learn. '}
                {learningCount === 0 && 'Add skills you want to learn to find matching peers. '}
                <Link to="/profile" className="font-medium underline hover:text-yellow-900">Edit profile →</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}