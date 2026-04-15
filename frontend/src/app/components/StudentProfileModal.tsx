import { useState, useEffect } from 'react';
import { Student, Event, StudentEvent } from '@/app/types';
import { api } from '@/app/api';
import { X, Trophy, CheckCircle, Award, Loader2 } from 'lucide-react';

function mapEvent(raw: any): Event {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    participationPoints: raw.participation_points ?? raw.participationPoints ?? 0,
    winningPoints: raw.winning_points ?? raw.winningPoints ?? 0,
    category: raw.category,
  };
}

function mapStudentEvent(raw: any): StudentEvent {
  return {
    studentId: raw.student_id ?? raw.studentId,
    eventId: raw.event_id ?? raw.eventId,
    status: raw.status,
    pointsCollected: raw.points_collected === 1 || raw.points_collected === true || raw.pointsCollected === true,
    academicYear: raw.academic_year ?? raw.academicYear ?? 'Unknown',
  };
}

interface StudentProfileModalProps {
  student: Student;
  onClose: () => void;
}

export function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [studentEvents, setStudentEvents] = useState<StudentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, seData] = await Promise.all([
          api.getEvents(),
          api.getStudentEvents(student.id),
        ]);
        setEvents(eventsData.map(mapEvent));
        setStudentEvents(seData.map(mapStudentEvent));
      } catch (err) {
        console.error('Failed to fetch student profile data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [student.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md text-2xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-2xl text-gray-900 font-bold">{student.name}</h3>
              <p className="text-gray-500">{student.email} • {student.year}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
             <Trophy className="w-8 h-8 text-blue-600" />
             <div>
               <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">Total Points</p>
               <p className="text-3xl font-bold text-gray-900">{student.totalPoints}</p>
             </div>
          </div>
          <div className="flex items-center space-x-4 text-right">
             <div>
               <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">Achievements</p>
               <p className="text-3xl font-bold text-gray-900">{studentEvents.length}</p>
             </div>
             <Award className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Performance & Events</h4>
        
        {/* Events List */}
        {loading ? (
           <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : studentEvents.length === 0 ? (
           <div className="py-12 text-center text-gray-500 bg-gray-50 border border-gray-100 rounded-xl">
             <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             <p className="font-medium text-lg">No achievements recorded yet.</p>
             <p className="text-sm text-gray-400 mt-1">This student hasn't participated in any events.</p>
           </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(
              studentEvents.reduce((acc, se) => {
                const year = se.academicYear || 'Other';
                if (!acc[year]) acc[year] = [];
                acc[year].push(se);
                return acc;
              }, {} as Record<string, typeof studentEvents>)
            )
            .sort(([yearA], [yearB]) => yearA.localeCompare(yearB))
            .map(([year, yearlyEvents]) => (
              <div key={year} className="space-y-4">
                <h5 className="text-lg font-bold text-gray-700 flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm">{year}</span>
                </h5>
                <div className="space-y-4 pl-2 border-l-2 border-blue-50">
                  {(() => {
                    const wonEvents = yearlyEvents.filter(se => se.status === 'won');
                    const participatedEvents = yearlyEvents.filter(se => se.status === 'participated');

                    const renderEventCard = (se: typeof studentEvents[0]) => {
                      const event = events.find(e => e.id === se.eventId);
                      if (!event) return null;
                      const points = se.status === 'won' ? event.winningPoints : event.participationPoints;

                      return (
                        <div key={se.eventId} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:shadow-md transition group">
                          <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                            <div>
                              <h6 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition">{event.name}</h6>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">
                                  {event.category}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            {se.pointsCollected ? (
                              <span className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block text-sm">+{points} PTS</span>
                            ) : (
                              <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded inline-block">Pending Approval</span>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        {wonEvents.length > 0 && (
                          <div className="space-y-3">
                            <h6 className="text-sm font-bold text-green-700 uppercase tracking-wider flex items-center space-x-2">
                              <Trophy className="w-4 h-4" /> <span>Awards & Wins</span>
                            </h6>
                            <div className="space-y-3">
                              {wonEvents.map(renderEventCard)}
                            </div>
                          </div>
                        )}

                        {participatedEvents.length > 0 && (
                          <div className="space-y-3">
                            <h6 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" /> <span>Participations</span>
                            </h6>
                            <div className="space-y-3">
                              {participatedEvents.map(renderEventCard)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
