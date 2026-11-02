import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, X, Plus, Trash2, Upload, Image, Calendar, Clock, User, Building2, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '', bio: '', college: '', branch: '', year: '',
    skillsToTeach: [], skillsToLearn: [], availability: [], avatar: ''
  });
  const [teachInput, setTeachInput] = useState('');
  const [learnInput, setLearnInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        college: user.college || '',
        branch: user.branch || '',
        year: user.year || '',
        skillsToTeach: user.skillsToTeach || [],
        skillsToLearn: user.skillsToLearn || [],
        availability: user.availability || [],
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      updateUser(data);
      showMessage('success', 'Profile saved successfully');
    } catch (err) {
      showMessage('error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (type) => {
    const input = type === 'teach' ? teachInput : learnInput;
    const name = input.trim();
    if (!name) return;
    const skills = [...form[`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]];
    if (skills.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    skills.push({ name, proficiency: 3, targetProficiency: 3 });
    setForm({ ...form, [`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]: skills });
    if (type === 'teach') setTeachInput(''); else setLearnInput('');
  };

  const removeSkill = (type, index) => {
    const skills = [...form[`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]];
    skills.splice(index, 1);
    setForm({ ...form, [`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]: skills });
  };

  const updateProficiency = (type, index, field, value) => {
    const skills = [...form[`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]];
    skills[index] = { ...skills[index], [field]: value };
    setForm({ ...form, [`skillsTo${type === 'teach' ? 'Teach' : 'Learn'}`]: skills });
  };

  const toggleSlot = (day, slot) => {
    const avail = [...form.availability];
    const dayIndex = avail.findIndex(d => d.day === day);
    if (dayIndex >= 0) {
      const slots = [...avail[dayIndex].slots];
      const slotIndex = slots.indexOf(slot);
      if (slotIndex >= 0) slots.splice(slotIndex, 1);
      else slots.push(slot);
      avail[dayIndex] = { day, slots };
    } else {
      avail.push({ day, slots: [slot] });
    }
    setForm({ ...form, availability: avail });
  };

  const hasSlot = (day, slot) => {
    const dayAvail = form.availability.find(d => d.day === day);
    return dayAvail?.slots.includes(slot);
  };

  const SkillEditor = ({ type, skills, input, setInput, onAdd, onRemove, onUpdate }) => {
    const label = type === 'teach' ? 'Skills I Can Teach' : 'Skills I Want to Learn';
    const icon = type === 'teach' ? BookOpen : TrendingUp;
    const fieldLabel = type === 'teach' ? 'Proficiency' : 'Target Level';
    const Icon = icon;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder={`Add a skill (e.g., Python, Calculus...)`}
          />
          <button onClick={onAdd} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Add
          </button>
        </div>
        {skills.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No skills added yet</p>
        ) : (
          <div className="space-y-3">
            {skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={skill.name}
                  readOnly
                  className="flex-1 bg-transparent border-none outline-none font-medium"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">{fieldLabel}</span>
                  <select
                    value={skill[fieldLabel === 'Proficiency' ? 'proficiency' : 'targetProficiency']}
                    onChange={e => onUpdate(i, fieldLabel === 'Proficiency' ? 'proficiency' : 'targetProficiency', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button onClick={() => onRemove(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const AvailabilityEditor = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">Weekly Availability</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="p-2 font-medium">Day</th>
              {TIME_SLOTS.map(slot => (
                <th key={slot} className="p-2 text-center font-medium">{slot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day} className="border-t border-gray-100">
                <td className="p-2 font-medium text-gray-700">{day}</td>
                {TIME_SLOTS.map(slot => (
                  <td key={slot} className="p-1 text-center">
                    <button
                      onClick={() => toggleSlot(day, slot)}
                      className={`w-full h-8 rounded transition-colors ${
                        hasSlot(day, slot)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">Click time slots to toggle availability</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message.type && (
        <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
            <input
              value={form.college}
              onChange={e => setForm({ ...form, college: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input
              value={form.branch}
              onChange={e => setForm({ ...form, branch: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              min="1" max="5"
              value={form.year}
              onChange={e => setForm({ ...form, year: parseInt(e.target.value) || '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Tell others about yourself..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillEditor
          type="teach"
          skills={form.skillsToTeach}
          input={teachInput}
          setInput={setTeachInput}
          onAdd={() => addSkill('teach')}
          onRemove={i => removeSkill('teach', i)}
          onUpdate={(i, field, value) => updateProficiency('teach', i, field, value)}
        />
        <SkillEditor
          type="learn"
          skills={form.skillsToLearn}
          input={learnInput}
          setInput={setLearnInput}
          onAdd={() => addSkill('learn')}
          onRemove={i => removeSkill('learn', i)}
          onUpdate={(i, field, value) => updateProficiency('learn', i, field, value)}
        />
      </div>

      <AvailabilityEditor />
    </div>
  );
}