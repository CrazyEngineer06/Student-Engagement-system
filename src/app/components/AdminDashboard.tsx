import { useState, useEffect, useCallback } from 'react';
import { Student, Event, Submission } from '@/app/types';
import { api } from '@/app/api';
import { Trophy, FileText, Plus, LogOut, X, CheckCircle, XCircle, Eye, Loader2, Download, Image } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'submissions'>('leaderboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewProofModal, setViewProofModal] = useState<Submission | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    participationPoints: 0,
    winningPoints: 0,
    category: 'hackathon' as Event['category'],
  });

  const fetchData = useCallback(async () => {
    try {
      const [studentsData, subsData] = await Promise.all([
        api.getStudents(),
        api.getSubmissions(),
      ]);
      setStudents(studentsData.map(mapStudent));
      setSubmissions(subsData.map(mapSubmission));
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
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

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
      await api.approveSubmission(submissionId);
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
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
                  {sortedStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
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
                </tbody>
              </table>
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
                          {submission.claimType === 'won' ? 'Winner Claim' : 'Participation Claim'}
                        </span>
                        <span className="text-sm text-gray-500">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                        </span>
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
    </div>
  );
}
