import { useState, useEffect, useCallback } from 'react';
import { Student, Event, Submission, ValueAddedCourse, RefundApplication } from '@/app/types';
import { api } from '@/app/api';
import { Trophy, FileText, Plus, LogOut, X, CheckCircle, XCircle, Eye, Loader2, Download, Image, Award, BookOpen, Wallet, MessageSquare } from 'lucide-react';
import { StudentProfileModal } from './StudentProfileModal';
interface AdminDashboardProps {
  onLogout: () => void;
}

// Map DB snake_case to frontend
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

function mapSubmission(raw: any): Submission {
  return {
    id: raw.id,
    studentId: raw.student_id ?? raw.studentId,
    studentName: raw.student_name ?? raw.studentName,
    eventId: raw.event_id ?? raw.eventId,
    eventName: raw.event_name ?? raw.eventName,
    claimType: raw.claim_type ?? raw.claimType,
    proofFile: raw.proof_file ?? raw.proofFile,
    proofFileOriginal: raw.proof_file_original ?? raw.proofFileOriginal ?? '',
    status: raw.status,
    submittedAt: raw.submitted_at ?? raw.submittedAt,
  };
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'submissions' | 'courses' | 'refunds'>('leaderboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewProofModal, setViewProofModal] = useState<Submission | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Student | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('All');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [courses, setCourses] = useState<ValueAddedCourse[]>([]);
  const [refunds, setRefunds] = useState<RefundApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardTypes, setAwardTypes] = useState<Record<string, 'participated' | 'won'>>({});
  const [courseYearFilter, setCourseYearFilter] = useState<string>('All');
  const [courseStudentFilter, setCourseStudentFilter] = useState<string>('All');
  const [viewRefundModal, setViewRefundModal] = useState<RefundApplication | null>(null);
  const [refundRemark, setRefundRemark] = useState('');

  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    participationPoints: 0,
    winningPoints: 0,
    category: 'hackathon' as Event['category'],
  });

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
      const [studentsData, subsData, coursesData, refundsData] = await Promise.all([
        api.getStudents(),
        api.getSubmissions(),
        api.getCourses(),
        api.getRefunds(),
      ]);
      setStudents(studentsData.map(mapStudent));
      setSubmissions(subsData.map(mapSubmission));
      setCourses(coursesData.map(mapCourse));
      setRefunds(refundsData.map(mapRefund));
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedStudents = [...students].sort((a, b) => b.totalPoints - a.totalPoints);
  const filteredLeaderboardStudents = sortedStudents.filter(s => selectedYearFilter === 'All' || s.year === selectedYearFilter);
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const filteredCourses = courses
    .filter(c => courseYearFilter === 'All' || c.year === courseYearFilter)
    .filter(c => courseStudentFilter === 'All' || c.studentId === courseStudentFilter);

  const handleCreateAnnouncement = async () => {
    if (newEvent.name && newEvent.description) {
      try {
        await api.createEvent(newEvent);
        setNewEvent({
          name: '',
          description: '',
          participationPoints: 0,
          winningPoints: 0,
          category: 'hackathon',
        });
        setShowCreateModal(false);
      } catch (err) {
        alert('Failed to create announcement');
      }
    }
  };

  const handleApprove = async (submissionId: string) => {
    try {
      const awardType = awardTypes[submissionId] || 'participated';
      await api.approveSubmission(submissionId, awardType);
      await fetchData();
    } catch (err) {
      alert('Failed to approve submission');
    }
  };

  const handleReject = async (submissionId: string) => {
    try {
      await api.rejectSubmission(submissionId);
      await fetchData();
    } catch (err) {
      alert('Failed to reject submission');
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    try {
      await api.approveRefund(refundId, refundRemark);
      setViewRefundModal(null);
      setRefundRemark('');
      await fetchData();
    } catch (err) {
      alert('Failed to approve refund');
    }
  };

  const handleRejectRefund = async (refundId: string) => {
    try {
      await api.rejectRefund(refundId, refundRemark);
      setViewRefundModal(null);
      setRefundRemark('');
      await fetchData();
    } catch (err) {
      alert('Failed to reject refund');
    }
  };

  // Determine if a proof file is an image
  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const isPdfFile = (filename: string) => {
    return /\.pdf$/i.test(filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading admin dashboard...</p>
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
                <span className="text-lg font-semibold">A</span>
              </div>
              <div>
                <h2 className="text-xl text-gray-900 font-bold">Admin Dashboard</h2>
                <p className="text-sm text-gray-500">Manage events and submissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>New Announcement</span>
              </button>
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
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-md transition ${
              activeTab === 'submissions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Pending Submissions</span>
            {pendingSubmissions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                {pendingSubmissions.length}
              </span>
            )}
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
            {refunds.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                {refunds.filter(r => r.status === 'pending').length}
              </span>
            )}
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
                      Email
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
                      className="hover:bg-gray-100 cursor-pointer transition"
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
                          <span className="text-gray-900 font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {student.email}
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
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {pendingSubmissions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending submissions</p>
                <p className="text-sm text-gray-400 mt-2">Submissions will appear here when students upload proof</p>
              </div>
            ) : (
              pendingSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          {submission.studentName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg text-gray-900 font-semibold">{submission.studentName}</h3>
                          <p className="text-sm text-gray-500">{submission.eventName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          submission.claimType === 'won'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          Student Claims: {submission.claimType === 'won' ? 'Winner' : 'Participation'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Admin Award Type Selector */}
                      <div className="flex items-center space-x-2 mt-3 bg-gray-50 rounded-lg p-3">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">Award as:</span>
                        <select
                          value={awardTypes[submission.id] || submission.claimType}
                          onChange={(e) => setAwardTypes(prev => ({ ...prev, [submission.id]: e.target.value as 'participated' | 'won' }))}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                          <option value="participated">Participation Points</option>
                          <option value="won">Winning Points</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewProofModal(submission)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View Proof"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(submission.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Value Added Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Completed Courses (Approved for Refund)</h2>
              {/* Student Filter */}
              <select
                value={courseStudentFilter}
                onChange={(e) => setCourseStudentFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
              >
                <option value="All">All Students</option>
                {sortedStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {refunds.filter(r => r.status === 'approved' && (courseStudentFilter === 'All' || r.studentId === courseStudentFilter)).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No approved courses found</p>
                <p className="text-sm text-gray-400 mt-2">Courses that have been approved for a refund will appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Course Name</th>
                        <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Provider</th>
                        <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs text-gray-500 uppercase tracking-wider">Approved On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {refunds.filter(r => r.status === 'approved' && (courseStudentFilter === 'All' || r.studentId === courseStudentFilter)).map((refund) => (
                        <tr key={refund.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm">
                                {(refund.studentName || '?').charAt(0)}
                              </div>
                              <span className="text-gray-900 font-medium">{refund.studentName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-900 font-medium">{refund.courseName}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {refund.provider || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Approved
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm">
                            {refund.appliedAt ? new Date(refund.appliedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refunds Tab */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            {refunds.filter(r => r.status === 'pending').length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending refund applications</p>
                <p className="text-sm text-gray-400 mt-2">New refund applications from students will appear here</p>
              </div>
            ) : (
              refunds.filter(r => r.status === 'pending').map((refund) => (
                <div key={refund.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {refund.studentName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg text-gray-900 font-semibold">{refund.studentName}</h3>
                          <p className="text-sm text-gray-500">Applied on {new Date(refund.appliedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 inline-block">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Course:</span> {refund.courseName}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Provider:</span> {refund.provider || '—'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setViewRefundModal(refund);
                          setRefundRemark('');
                        }}
                        className="flex items-center space-x-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition font-medium"
                      >
                        <Eye className="w-5 h-5" />
                        <span>Review Application</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl text-gray-900 font-bold">Create New Announcement</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Event Name</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="e.g., Spring Hackathon 2026"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Describe the event..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-medium">Participation Points</label>
                  <input
                    type="number"
                    value={newEvent.participationPoints}
                    onChange={(e) => setNewEvent({ ...newEvent, participationPoints: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-medium">Winning Points</label>
                  <input
                    type="number"
                    value={newEvent.winningPoints}
                    onChange={(e) => setNewEvent({ ...newEvent, winningPoints: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">Category</label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as Event['category'] })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="hackathon">Hackathon</option>
                  <option value="competition">Competition</option>
                  <option value="sports">Sports</option>
                  <option value="cultural">Cultural</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCreateAnnouncement}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition"
              >
                Create Announcement
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Proof Modal — FIXED: Now shows actual uploaded file */}
      {viewProofModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-900 font-bold">Submission Proof</h3>
              <button
                onClick={() => setViewProofModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Submission Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1">
              <p className="text-gray-700">
                <span className="font-medium">Student:</span> {viewProofModal.studentName}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Event:</span> {viewProofModal.eventName}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Claim:</span>{' '}
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  viewProofModal.claimType === 'won'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {viewProofModal.claimType === 'won' ? 'Winner' : 'Participation'}
                </span>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Original File:</span> {viewProofModal.proofFileOriginal || viewProofModal.proofFile}
              </p>
            </div>

            {/* Actual File Preview */}
            <div className="rounded-lg overflow-hidden border border-gray-200 mb-4">
              {isImageFile(viewProofModal.proofFile) ? (
                <div className="bg-gray-100 p-2">
                  <img
                    src={api.getProofFileUrl(viewProofModal.proofFile)}
                    alt="Proof document"
                    className="max-w-full max-h-[500px] mx-auto rounded-lg object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `
                        <div class="text-center py-12">
                          <p class="text-red-500 font-medium">Failed to load image</p>
                          <p class="text-gray-400 text-sm mt-1">The file might have been removed</p>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : isPdfFile(viewProofModal.proofFile) ? (
                <iframe
                  src={api.getProofFileUrl(viewProofModal.proofFile)}
                  width="100%"
                  height="500"
                  className="border-0"
                  title="Proof PDF"
                />
              ) : (
                <div className="bg-gray-100 p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{viewProofModal.proofFileOriginal || viewProofModal.proofFile}</p>
                  <p className="text-sm text-gray-400 mt-1">Preview not available for this file type</p>
                </div>
              )}
            </div>

            {/* Download Link */}
            <div className="flex items-center justify-center mb-4">
              <a
                href={api.getProofFileUrl(viewProofModal.proofFile)}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Download Original File</span>
              </a>
            </div>

            {/* Award Type Selector in Modal */}
            <div className="flex items-center space-x-3 bg-indigo-50 rounded-lg p-4 mb-4">
              <Award className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-700">Award as:</span>
              <select
                value={awardTypes[viewProofModal.id] || viewProofModal.claimType}
                onChange={(e) => setAwardTypes(prev => ({ ...prev, [viewProofModal.id]: e.target.value as 'participated' | 'won' }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="participated">Participation Points</option>
                <option value="won">Winning Points</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  handleApprove(viewProofModal.id);
                  setViewProofModal(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => {
                  handleReject(viewProofModal.id);
                  setViewProofModal(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
              >
                <XCircle className="w-5 h-5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Refund Modal */}
      {viewRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-900 font-bold">Review Refund Application</h3>
              <button
                onClick={() => setViewRefundModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student</p>
                <p className="font-medium text-gray-900">{viewRefundModal.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p className="font-medium text-gray-900">{viewRefundModal.courseName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Provider</p>
                <p className="font-medium text-gray-900">{viewRefundModal.provider || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied On</p>
                <p className="font-medium text-gray-900">{new Date(viewRefundModal.appliedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Fee Receipt */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" /> Fee Receipt
                </h4>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  {isImageFile(viewRefundModal.feeReceipt) ? (
                    <img
                      src={api.getProofFileUrl(viewRefundModal.feeReceipt)}
                      alt="Fee Receipt"
                      className="w-full h-48 object-contain bg-gray-100"
                    />
                  ) : isPdfFile(viewRefundModal.feeReceipt) ? (
                    <iframe
                      src={api.getProofFileUrl(viewRefundModal.feeReceipt)}
                      width="100%"
                      height="192"
                      className="border-0"
                      title="Fee Receipt PDF"
                    />
                  ) : (
                    <div className="h-48 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-sm">Preview not available</span>
                    </div>
                  )}
                  <div className="bg-gray-50 p-2 text-center border-t border-gray-200">
                    <a
                      href={api.getProofFileUrl(viewRefundModal.feeReceipt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 mr-1" /> Download Result
                    </a>
                  </div>
                </div>
              </div>

              {/* Certificate */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Award className="w-4 h-4 mr-2" /> Certificate
                </h4>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  {isImageFile(viewRefundModal.certificate) ? (
                    <img
                      src={api.getProofFileUrl(viewRefundModal.certificate)}
                      alt="Certificate"
                      className="w-full h-48 object-contain bg-gray-100"
                    />
                  ) : isPdfFile(viewRefundModal.certificate) ? (
                    <iframe
                      src={api.getProofFileUrl(viewRefundModal.certificate)}
                      width="100%"
                      height="192"
                      className="border-0"
                      title="Certificate PDF"
                    />
                  ) : (
                    <div className="h-48 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-sm">Preview not available</span>
                    </div>
                  )}
                  <div className="bg-gray-50 p-2 text-center border-t border-gray-200">
                    <a
                      href={api.getProofFileUrl(viewRefundModal.certificate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 mr-1" /> Download Result
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" /> Admin Remark (Optional)
              </label>
              <textarea
                value={refundRemark}
                onChange={(e) => setRefundRemark(e.target.value)}
                placeholder="E.g., Approved and forwarded to finance..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-20"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleApproveRefund(viewRefundModal.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Approve Refund</span>
              </button>
              <button
                onClick={() => handleRejectRefund(viewRefundModal.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition flex items-center justify-center space-x-2"
              >
                <XCircle className="w-5 h-5" />
                <span>Reject Refund</span>
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
