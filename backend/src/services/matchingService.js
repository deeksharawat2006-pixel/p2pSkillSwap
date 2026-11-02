import Student from '../models/Student.js';

const calculateMatchScore = (seeker, provider, weights = {}) => {
  const w = {
    skillOverlap: 0.4,
    availability: 0.2,
    rating: 0.15,
    proximity: 0.15,
    proficiency: 0.1,
    ...weights
  };

  let score = 0;

  const seekerWants = new Set(seeker.skillsToLearn.map(s => s.name.toLowerCase()));
  const providerTeaches = new Set(provider.skillsToTeach.map(s => s.name.toLowerCase()));
  const overlap = [...seekerWants].filter(s => providerTeaches.has(s)).length;
  score += w.skillOverlap * (overlap / Math.max(seekerWants.size, 1));

  const availabilityScore = calculateAvailabilityOverlap(seeker.availability, provider.availability);
  score += w.availability * availabilityScore;

  score += w.rating * (provider.avgRating || 0) / 5;

  let proximity = 0;
  if (seeker.college === provider.college) proximity += 0.6;
  if (seeker.branch === provider.branch) proximity += 0.4;
  score += w.proximity * proximity;

  const proficiencyMatch = calculateProficiencyMatch(seeker, provider);
  score += w.proficiency * proficiencyMatch;

  return Math.min(score, 1);
};

const calculateAvailabilityOverlap = (a, b) => {
  let totalOverlap = 0, totalSlots = 0;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  
  for (const day of days) {
    const slotsA = a.find(d => d.day === day)?.slots || [];
    const slotsB = b.find(d => d.day === day)?.slots || [];
    totalSlots += Math.max(slotsA.length, slotsB.length);
    
    for (const slotA of slotsA) {
      for (const slotB of slotsB) {
        if (slotsOverlap(slotA, slotB)) totalOverlap++;
      }
    }
  }
  return totalSlots > 0 ? totalOverlap / totalSlots : 0;
};

const slotsOverlap = (a, b) => {
  const [aStart, aEnd] = a.split('-').map(t => parseInt(t.replace(':', '')));
  const [bStart, bEnd] = b.split('-').map(t => parseInt(t.replace(':', '')));
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
};

const calculateProficiencyMatch = (seeker, provider) => {
  let matches = 0, total = 0;
  for (const want of seeker.skillsToLearn) {
    const teach = provider.skillsToTeach.find(t => t.name.toLowerCase() === want.name.toLowerCase());
    if (teach) {
      total++;
      if (teach.proficiency >= want.targetProficiency) matches++;
    }
  }
  return total > 0 ? matches / total : 0;
};

const getMatchingSkills = (seeker, provider) => {
  const seekerWants = seeker.skillsToLearn.map(s => s.name.toLowerCase());
  return provider.skillsToTeach
    .filter(t => seekerWants.includes(t.name.toLowerCase()))
    .map(t => t.name);
};

export const findMatches = async (studentId, limit = 10) => {
  const seeker = await Student.findById(studentId).lean();
  if (!seeker) return [];

  const candidates = await Student.find({
    _id: { $ne: studentId },
    isActive: true,
    'skillsToTeach.0': { $exists: true }
  }).lean();

  const scored = candidates
    .map(provider => ({
      ...provider,
      matchScore: calculateMatchScore(seeker, provider),
      matchingSkills: getMatchingSkills(seeker, provider)
    }))
    .filter(m => m.matchScore > 0.15)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
};

export { calculateMatchScore, getMatchingSkills };