import { useState, useEffect, useCallback } from 'react';
import { Student, Event, StudentEvent, AuthUser, ValueAddedCourse, RefundApplication } from '@/app/types';
import { api } from '@/app/api';
import { Trophy, Calendar, History, LogOut, Award, CheckCircle, Loader2, BookOpen, Plus, X, Trash2, Wallet, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { StudentProfileModal } from './StudentProfileModal';
interface StudentDashboardProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

// Map DB snake_case to frontend camelCase
function mapStudent(raw: any): Student {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    year: raw.year,
    totalPoints: raw.total_points ?? raw.totalPoints ?? 0,
  };
}

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
  };
}

export function StudentDashboard({ currentUser, onLogout }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'announcements' | 'history' | 'courses' | 'refunds'>('leaderboard');
  const [participateModal, setParticipateModal] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<{ eventId: string; claimType: 'participated' | 'won' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Student | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('All');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [studentEvents, setStudentEvents] = useState<StudentEvent[]>([]);
  const [courses, setCourses] = useState<ValueAddedCourse[]>([]);
  const [refunds, setRefunds] = useState<RefundApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseYearFilter, setCourseYearFilter] = useState<string>('All');
  const [newCourse, setNewCourse] = useState({ courseName: '', provider: '', year: '1st Year' });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ courseName: '', provider: '', feeReceipt: null as File | null, certificate: null as File | null });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const currentStudent = mapStudent(currentUser);

  function mapCourse(raw: any): ValueAddedCourse {
    return {
      id: raw.id,
      studentId: raw.student_id ?? raw.studentId,
      studentName: raw.student_name ?? raw.studentName,
      courseName: raw.course_name ?? raw.courseName,
      provider: raw.provider ?? '',
      year: raw.year,
      completedAt: raw.completed_at ?? raw.completedAt ?? '',
    };
  }

  function mapRefund(raw: any): RefundApplication {
    return {
      id: raw.id,
      studentId: raw.student_id ?? raw.studentId,
      studentName: raw.student_name ?? raw.studentName,
      courseName: raw.course_name ?? raw.courseName,
      provider: raw.provider ?? '',
      feeReceipt: raw.fee_receipt ?? raw.feeReceipt,
      feeReceiptOriginal: raw.fee_receipt_original ?? raw.feeReceiptOriginal,
      certificate: raw.certificate,
      certificateOriginal: raw.certificate_original ?? raw.certificateOriginal,
      status: raw.status,
      adminRemark: raw.admin_remark ?? raw.adminRemark ?? '',
      appliedAt: raw.applied_at ?? raw.appliedAt,
    };
  }

  const fetchData = useCallback(async () => {
    try {
      const [studentsData, eventsData, seData, coursesData, refundsData] = await Promise.all([
        api.getStudents(),
        api.getEvents(),
        api.getStudentEvents(currentUser.id),
        api.getCourses(),
        api.getRefunds(),
      ]);
      setStudents(studentsData.map(mapStudent));
      setEvents(eventsData.map(mapEvent));
      setStudentEvents(seData.map(mapStudentEvent));
      setCourses(coursesData.map(mapCourse));
      setRefunds(refundsData.map(mapRefund));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort students by points for leaderboard
  const sortedStudents = [...students].sort((a, b) => b.totalPoints - a.totalPoints);
  const filteredLeaderboardStudents = sortedStudents.filter(s => selectedYearFilter === 'All' || s.year === selectedYearFilter);

  const currentStudentFromList = students.find(s => s.id === currentUser.id);
  const displayStudent = currentStudentFromList || currentStudent;
  const currentRank = sortedStudents.findIndex(s => s.id === currentUser.id) + 1;

  // Get student's participated events
  const myEvents = studentEvents.filter(se => se.studentId === currentUser.id);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleParticipate = async (eventId: string) => {
    try {
      await api.participate(eventId);
      await fetchData();
      setParticipateModal(null);
    } catch (err: any) {
      alert(err.message || 'Failed to participate');
    }
  };

  const handleSubmitProof = async () => {
    if (proofModal && selectedFile) {
      setSubmitting(true);
      try {
        await api.submitProof(proofModal.eventId, proofModal.claimType, selectedFile);
        setProofModal(null);
        setSelectedFile(null);
        await fetchData();
        alert('Proof submitted successfully! Waiting for admin approval.');
      } catch (err: any) {
        alert(err.message || 'Failed to submit proof');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleAddCourse = async () => {
    if (newCourse.courseName && newCourse.year) {
      try {
        await api.addCourse(newCourse);
        setNewCourse({ courseName: '', provider: '', year: '1st Year' });
        setShowAddCourseModal(false);
        await fetchData();
      } catch (err) {
        alert('Failed to add course');
      }
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      try {
        await api.deleteCourse(courseId);
        await fetchData();
      } catch (err) {
        alert('Failed to delete course');
      }
    }
  };

  const handleRefundSubmit = async () => {
    if (refundForm.courseName && refundForm.feeReceipt && refundForm.certificate) {
      setSubmittingRefund(true);
      try {
        await api.applyForRefund(refundForm.courseName, refundForm.provider, refundForm.feeReceipt, refundForm.certificate);
        setShowRefundModal(false);
        setRefundForm({ courseName: '', provider: '', feeReceipt: null, certificate: null });
        await fetchData();
        alert('Refund application submitted successfully!');
      } catch (err: any) {
        alert(err.message || 'Failed to submit refund application');
      } finally {
        setSubmittingRefund(false);
      }
    }
  };

  const filteredCourses = courses.filter(c => courseYearFilter === 'All' || c.year === courseYearFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <span className="text-lg font-semibold">{displayStudent.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-xl text-gray-900 font-bold">{displayStudent.name}</h2>
                <p className="text-sm text-gray-500">{displayStudent.year} • Rank #{currentRank || '—'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span className="text-2xl text-blue-600 font-bold">{displayStudent.totalPoints}</span>
                </div>
                <p className="text-xs text-gray-500">Total Points</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'leaderboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Announcements</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-5 h-5" />
            <span>History</span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'courses'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Courses</span>
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'refunds'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span>Refunds</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            {/* Year Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {['All', '1st Year', '2nd Year', '3rd Year', '4th Year'].map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYearFilter(year)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition shadow-sm ${
                    selectedYearFilter === year
                      ? 'bg-blue-600 text-white border-transparent'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {year === 'All' ? 'Overall Leaderboard' : year}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-4 text-right text-xs text-gray-500 uppercase tracking-wider">
                      Total Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeaderboardStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedProfile(student)}
                      className={`cursor-pointer transition ${student.id === currentUser.id ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index < 3 ? (
                            <Trophy
                              className={`w-6 h-6 ${
                                index === 0
                                  ? 'text-yellow-500'
                                  : index === 1
                                  ? 'text-gray-400'
                                  : 'text-amber-700'
                              }`}
                            />
                          ) : (
                            <span className="text-gray-600 font-medium">{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-gray-900 font-medium">{student.name}</span>
                            {student.id === currentUser.id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {student.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-blue-600 font-semibold">{student.totalPoints}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredLeaderboardStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No students found for {selectedYearFilter}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="grid gap-6 md:grid-cols-2">
            {events.map((event) => {
              const categoryColors = {
                hackathon: 'bg-purple-100 text-purple-700',
                competition: 'bg-blue-100 text-blue-700',
                sports: 'bg-green-100 text-green-700',
                cultural: 'bg-pink-100 text-pink-700',
              };

              const alreadyParticipated = myEvents.some(se => se.eventId === event.id);

              return (
                <div key={event.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg text-gray-900 font-semibold">{event.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs ${categoryColors[event.category]}`}>
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-4">
                      <div>
                        <p className="text-xs text-gray-500">Participation</p>
                        <p className="text-blue-600 font-semibold">{event.participationPoints} pts</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Winning</p>
                        <p className="text-blue-600 font-semibold">{event.winningPoints} pts</p>
                      </div>
                    </div>
                  </div>
                  {alreadyParticipated ? (
                    <div className="w-full text-center py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Already Participated</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setParticipateModal(event.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition"
                    >
                      Participate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {myEvents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No participation history yet</p>
                <p className="text-sm text-gray-400 mt-2">Start participating in events to build your portfolio!</p>
              </div>
            ) : (
              myEvents.map((se) => {
                const event = events.find(e => e.id === se.eventId);
                if (!event) return null;

                const points = se.status === 'won' ? event.winningPoints : event.participationPoints;

                return (
                  <div key={`${se.studentId}-${se.eventId}`} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg text-gray-900 mb-1 font-semibold">{event.name}</h3>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`px-2 py-1 rounded ${
                            se.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {se.status === 'won' ? 'Winner' : 'Participated'}
                          </span>
                          <span className="text-gray-600">{points} points</span>
                        </div>
                      </div>
                      <div>
                        {se.pointsCollected ? (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm">Collected</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setProofModal({ eventId: se.eventId, claimType: se.status })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
                          >
                            Collect Points
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Value Added Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Completed Courses (Approved for Refund)</h2>
            </div>

            {refunds.filter(r => r.status === 'approved').length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No approved courses found</p>
                <p className="text-sm text-gray-400 mt-2">Apply for a refund to add completed courses to your profile!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {refunds.filter(r => r.status === 'approved').map((refund) => (
                  <div key={refund.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-semibold text-lg">{refund.courseName}</h3>
                        {refund.provider && (
                          <p className="text-sm text-gray-500 mt-1">Provider: {refund.provider}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-3">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Approved
                          </span>
                          <span className="text-xs text-gray-400">
                            Applied {new Date(refund.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Course Refunds</h2>
              <button
                onClick={() => setShowRefundModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Apply for Refund</span>
              </button>
            </div>

            {refunds.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No refund applications found</p>
                <p className="text-sm text-gray-400 mt-2">Apply for a refund for your completed value-added courses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {refunds.map((refund) => (
                  <div key={refund.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg text-gray-900 font-semibold">{refund.courseName}</h3>
                        <p className="text-sm text-gray-500">{refund.provider}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                          refund.status === 'approved' ? 'bg-green-100 text-green-700' :
                          refund.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {refund.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                          {refund.status === 'rejected' && <XCircle className="w-4 h-4" />}
                          {refund.status === 'pending' && <Clock className="w-4 h-4" />}
                          <span className="capitalize">{refund.status}</span>
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Applied {new Date(refund.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {refund.adminRemark && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                        <span className="font-semibold text-gray-700">Admin Remark: </span>
                        <span className="text-gray-600">{refund.adminRemark}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Participate Modal */}
      {participateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl text-gray-900 mb-4 font-bold">Event Registration</h3>
            <p className="text-gray-600 mb-6">
              Confirm your participation in this event. You'll be able to submit proof and collect points after the event.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleParticipate(participateModal)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setParticipateModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl text-gray-900 mb-4 font-bold">Submit Proof</h3>
            <p className="text-gray-600 mb-4">
              Upload a certificate, screenshot, or document as proof of your {proofModal.claimType === 'won' ? 'win' : 'participation'}.
            </p>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2 font-medium">Upload File</label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSubmitProof}
                disabled={!selectedFile || submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => {
                  setProofModal(null);
                  setSelectedFile(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-gray-900 font-bold">Add Value Added Course</h3>
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Course Name *</label>
                <input
                  type="text"
                  value={newCourse.courseName}
                  onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })}
                  placeholder="e.g., Machine Learning Fundamentals"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Provider</label>
                <input
                  type="text"
                  value={newCourse.provider}
                  onChange={(e) => setNewCourse({ ...newCourse, provider: e.target.value })}
                  placeholder="e.g., Coursera, Udemy, NPTEL"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Year Completed *</label>
                <select
                  value={newCourse.year}
                  onChange={(e) => setNewCourse({ ...newCourse, year: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddCourse}
                disabled={!newCourse.courseName}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Course
              </button>
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply for Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl text-gray-900 font-bold">Apply for Refund</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Course Name *</label>
                <input
                  type="text"
                  value={refundForm.courseName}
                  onChange={(e) => setRefundForm({ ...refundForm, courseName: e.target.value })}
                  placeholder="e.g., Data Science Bootcamp"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Provider</label>
                <input
                  type="text"
                  value={refundForm.provider}
                  onChange={(e) => setRefundForm({ ...refundForm, provider: e.target.value })}
                  placeholder="e.g., Coursera"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Fee Receipt *</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setRefundForm({ ...refundForm, feeReceipt: e.target.files?.[0] || null })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                />
                {refundForm.feeReceipt && (
                  <p className="text-xs text-green-600 mt-2 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Selected: {refundForm.feeReceipt.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Certificate of Completion *</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setRefundForm({ ...refundForm, certificate: e.target.files?.[0] || null })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                />
                {refundForm.certificate && (
                  <p className="text-xs text-green-600 mt-2 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Selected: {refundForm.certificate.name}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleRefundSubmit}
                disabled={!refundForm.courseName || !refundForm.feeReceipt || !refundForm.certificate || submittingRefund}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {submittingRefund ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Application'}
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                disabled={submittingRefund}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedProfile && (
        <StudentProfileModal student={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}
    </div>
  );
}
