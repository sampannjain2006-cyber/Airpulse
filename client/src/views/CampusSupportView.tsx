/**
 * AIRPULSE — Campus Support & Student Environmental Health View (Feature 14)
 * Institutional decision-support module with privacy-conscious student profiles,
 * transparent policy evaluation, notice review/approval, and academic accommodations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  CampusInstitution,
  CampusEnvironmentalStatus,
  CampusPolicyRule,
  PolicyEvaluationResult,
  StudentSupportProfile,
  CampusNotice,
  AccommodationRequest,
  CampusAuditLog,
  CampusCatalogMetadata,
  CampusRole,
} from '../types/campus';
import { campusApi } from '../api/campus';

interface CampusSupportViewProps {
  onOpenPollutantInfo?: (pollutantId: string) => void;
}

export const CampusSupportView: React.FC<CampusSupportViewProps> = ({
  onOpenPollutantInfo,
}) => {
  // Institutional context & role simulation state
  const [campuses, setCampuses] = useState<CampusInstitution[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<number>(1);
  const [currentRole, setCurrentRole] = useState<CampusRole>('support_staff');
  const [activeTab, setActiveTab] = useState<'status' | 'policies' | 'students' | 'notices' | 'accommodations' | 'audit'>('status');

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CampusCatalogMetadata | null>(null);
  const [envStatus, setEnvStatus] = useState<CampusEnvironmentalStatus | null>(null);
  const [policies, setPolicies] = useState<CampusPolicyRule[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<PolicyEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentSupportProfile[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [notices, setNotices] = useState<CampusNotice[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<CampusAuditLog[]>([]);

  // Action / Form states
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('precaution_guidance');
  const [newNoticeAdvisory, setNewNoticeAdvisory] = useState('');
  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState(false);

  // New Student Profile Form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDept, setNewStudentDept] = useState('Computer Science');
  const [newStudentCategory, setNewStudentCategory] = useState('respiratory_sensitivity');
  const [newStudentAccPref, setNewStudentAccPref] = useState('recorded_lecture');
  const [newStudentConsent, setNewStudentConsent] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);

  // New Accommodation Request Form state
  const [accCourseCode, setAccCourseCode] = useState('CS-301');
  const [accType, setAccType] = useState('recorded_lecture');
  const [accDate, setAccDate] = useState('2026-10-04');
  const [accReason, setAccReason] = useState('High PM2.5 forecast respiratory sensitivity.');
  const [isAccFormOpen, setIsAccFormOpen] = useState(false);

  // Notification message banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // 1. Initial Load of Campuses & Catalog
  useEffect(() => {
    let mounted = true;
    Promise.all([campusApi.listCampuses(), campusApi.getCatalog()])
      .then(([campusList, catalogMeta]) => {
        if (!mounted) return;
        setCampuses(campusList);
        setCatalog(catalogMeta);
        if (campusList.length > 0) {
          setSelectedCampusId(campusList[0].id);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to initialize campus data');
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch Campus Environmental Status & Policies whenever campus changes
  const loadCampusData = useCallback(async () => {
    if (!selectedCampusId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, policiesRes] = await Promise.all([
        campusApi.getEnvironmentalStatus(selectedCampusId),
        campusApi.getPolicies(selectedCampusId),
      ]);
      setEnvStatus(statusRes);
      setPolicies(policiesRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading campus status');
    } finally {
      setLoading(false);
    }
  }, [selectedCampusId]);

  useEffect(() => {
    loadCampusData();
  }, [loadCampusData]);

  // 3. Role-sensitive data loading
  const loadRoleProtectedData = useCallback(async () => {
    if (!selectedCampusId) return;

    // A. Notices (all roles can fetch; backend returns approved only for general_user/student)
    campusApi
      .listNotices(selectedCampusId, currentRole)
      .then(setNotices)
      .catch(() => setNotices([]));

    // B. Student Support Profiles (Strictly blocked for general_user and student)
    if (currentRole === 'campus_admin' || currentRole === 'support_staff') {
      campusApi
        .listStudents(selectedCampusId, currentRole)
        .then((data) => {
          setStudents(data);
          setStudentsError(null);
        })
        .catch((err) => {
          setStudents([]);
          setStudentsError(err.response?.data?.error?.message || err.message);
        });
    } else {
      setStudents([]);
      setStudentsError(
        'Access Restricted: Student voluntary support profiles are strictly confidential under institutional student privacy policy. Requires support_staff or campus_admin role.'
      );
    }

    // C. Accommodations
    if (currentRole !== 'general_user') {
      campusApi
        .listAccommodations(selectedCampusId, currentRole, currentRole === 'student' ? 'STU-2026-0891' : undefined)
        .then(setAccommodations)
        .catch(() => setAccommodations([]));
    } else {
      setAccommodations([]);
    }

    // D. Audit logs
    if (currentRole === 'campus_admin' || currentRole === 'support_staff') {
      campusApi
        .getAuditLogs(selectedCampusId, currentRole)
        .then(setAuditLogs)
        .catch(() => setAuditLogs([]));
    } else {
      setAuditLogs([]);
    }
  }, [selectedCampusId, currentRole]);

  useEffect(() => {
    loadRoleProtectedData();
  }, [loadRoleProtectedData]);

  // Handle Policy Evaluation
  const handleEvaluatePolicy = async () => {
    setEvaluating(true);
    try {
      const res = await campusApi.evaluatePolicy(selectedCampusId, {}, currentRole);
      setEvaluationResult(res);
      showFeedback(
        `Evaluation complete: Tier ${res.triggered_policy.policy_tier} matched (${res.privacy_conscious_matching.eligible_students_for_review_count} students eligible for review).`,
        'success'
      );
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Evaluation failed', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  // Handle Notice Creation
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim()) return;
    try {
      const res = await campusApi.createNotice(
        selectedCampusId,
        {
          title: newNoticeTitle,
          category: newNoticeCategory,
          advisory_text: newNoticeAdvisory || 'Standard campus advisory regarding air quality conditions.',
          severity_tier: envStatus?.environmental_parameters.severity?.severity_level || 3,
          severity_category: envStatus?.environmental_parameters.severity?.category || 'Moderate',
          environmental_context: {
            pollutant: 'pm25',
            value: envStatus?.environmental_parameters.pm25 || 85,
            unit: 'µg/m³',
            source: envStatus?.data_provenance.source,
          },
          approved_accommodations: ['recorded_lecture', 'indoor_relocation'],
        },
        currentRole
      );
      showFeedback(`Notice draft ${res.notice_code} created successfully for review.`, 'success');
      setNewNoticeTitle('');
      setNewNoticeAdvisory('');
      setIsNoticeFormOpen(false);
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Notice creation failed', 'error');
    }
  };

  // Handle Notice Approval
  const handleApproveNotice = async (noticeId: number | string) => {
    try {
      const res = await campusApi.approveNotice(
        selectedCampusId,
        noticeId,
        { approved_by: currentRole === 'campus_admin' ? 'Campus Dean (Admin)' : 'Authorized Support Staff' },
        currentRole
      );
      showFeedback(
        `Notice ${res.notice_code} approved! Notice is now visible to campus community (Roadmap delivery staged).`,
        'success'
      );
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  };

  // Handle Student Registration
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentConsent) {
      showFeedback('Informed consent checkbox is required to register support profile.', 'error');
      return;
    }
    try {
      const res = await campusApi.registerStudent(
        selectedCampusId,
        {
          display_name: newStudentName || 'Student (Confidential)',
          academic_department: newStudentDept,
          support_category: newStudentCategory,
          accommodation_preference: newStudentAccPref,
          consent_acknowledged: true,
        },
        currentRole
      );
      showFeedback(`Voluntary profile registered for ${res.student_id_hash}.`, 'success');
      setNewStudentName('');
      setNewStudentConsent(false);
      setIsStudentFormOpen(false);
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Registration failed', 'error');
    }
  };

  // Handle Consent Withdrawal
  const handleWithdrawConsent = async (studentIdHash: string) => {
    try {
      await campusApi.withdrawConsent(selectedCampusId, studentIdHash, currentRole);
      showFeedback(`Voluntary consent withdrawn for ${studentIdHash}. Record deactivated.`, 'info');
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Withdrawal failed', 'error');
    }
  };

  // Handle Accommodation Submission
  const handleCreateAccommodation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await campusApi.createAccommodation(
        selectedCampusId,
        {
          course_code: accCourseCode,
          accommodation_type: accType,
          target_date: accDate,
          environmental_reason: accReason,
        },
        currentRole
      );
      showFeedback(`Accommodation request ${res.request_code} submitted for staff review.`, 'success');
      setIsAccFormOpen(false);
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Submission failed', 'error');
    }
  };

  // Handle Accommodation Decision
  const handleDecideAccommodation = async (accId: number | string, decision: 'approved' | 'declined') => {
    try {
      await campusApi.decideAccommodation(
        selectedCampusId,
        accId,
        { decision, notes: `Decision rendered by ${currentRole}.` },
        currentRole
      );
      showFeedback(`Accommodation request ${decision} successfully.`, 'success');
      loadRoleProtectedData();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : 'Decision failed', 'error');
    }
  };

  const selectedCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  return (
    <div className="campus-support-view nature-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* 1. Header Banner & Title */}
      <div className="campus-view-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(27,67,50,0.15)', paddingBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>🎓</span>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1b4332' }}>
                Student Environmental Health &amp; Campus Support
              </h1>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#40916c', maxWidth: '800px' }}>
              Privacy-conscious institutional decision-support system for <strong>{selectedCampus?.name || 'Selected Campus'}</strong> ({selectedCampus?.city || 'India'}). Assists educational staff in coordinating academic accommodations, reviewing environmental advisories, and supporting voluntarily disclosed student needs.
            </p>
          </div>

          {/* Campus Selector & Role Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="campus-select" style={{ fontSize: '12px', fontWeight: 600, color: '#2d6a4f' }}>
                Campus:
              </label>
              <select
                id="campus-select"
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #74c69d',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1b4332',
                }}
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher Bar to demonstrate Server-Side Authorization */}
            <div style={{ background: '#e8f5e9', padding: '6px 10px', borderRadius: '8px', border: '1px solid #b7e4c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2d6a4f', marginBottom: '4px' }}>
                ACTIVE SIMULATED ROLE (ENFORCED ON BACKEND):
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(['general_user', 'student', 'support_staff', 'campus_admin'] as CampusRole[]).map((r) => {
                  const isActive = currentRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCurrentRole(r)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: '4px',
                        border: isActive ? '1px solid #1b4332' : '1px solid #cce3de',
                        background: isActive ? '#1b4332' : '#ffffff',
                        color: isActive ? '#ffffff' : '#2d6a4f',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Switch role to ${r} to test least-privilege backend access`}
                    >
                      {r === 'general_user' && '🌐 General'}
                      {r === 'student' && '🎓 Student'}
                      {r === 'support_staff' && '🛡️ Staff'}
                      {r === 'campus_admin' && '🏛️ Admin'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: feedbackMsg.type === 'error' ? '#fee2e2' : feedbackMsg.type === 'info' ? '#e0f2fe' : '#dcfce7',
              color: feedbackMsg.type === 'error' ? '#991b1b' : feedbackMsg.type === 'info' ? '#0369a1' : '#166534',
              border: `1px solid ${feedbackMsg.type === 'error' ? '#f87171' : feedbackMsg.type === 'info' ? '#7dd3fc' : '#86efac'}`,
            }}
          >
            {feedbackMsg.text}
          </div>
        )}
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'status', label: 'Campus Environmental Status', icon: '🌿' },
          { id: 'policies', label: 'Response Policies & Evaluation', icon: '⚖️' },
          { id: 'students', label: 'Voluntary Support Profiles', icon: '🔒' },
          { id: 'notices', label: 'Notice Review & Approval', icon: '📢', badge: notices.length },
          { id: 'accommodations', label: 'Academic Accommodations', icon: '📝', badge: accommodations.length },
          { id: 'audit', label: 'Institutional Audit Trail', icon: '📋' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1b4332' : '#64748b',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #1b4332' : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{ fontSize: '10px', background: isActive ? '#1b4332' : '#94a3b8', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. TAB 1: Campus Environmental Status */}
      {activeTab === 'status' && (
        <div className="campus-tab-status">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading campus environmental telemetry…</div>
          ) : error ? (
            <div style={{ padding: '1.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>
          ) : envStatus ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Card A: Campus Environmental Telemetry */}
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      CAMPUS TELEMETRY
                    </span>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#1b4332' }}>
                      {envStatus.campus.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      📍 {envStatus.campus.city}, {envStatus.campus.state} ({envStatus.campus.coordinates.latitude.toFixed(4)}°N, {envStatus.campus.coordinates.longitude.toFixed(4)}°E)
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: envStatus.data_provenance.is_stale ? '#fee2e2' : '#e0f2fe',
                      color: envStatus.data_provenance.is_stale ? '#991b1b' : '#0369a1',
                    }}
                  >
                    {envStatus.data_provenance.data_type.toUpperCase()}
                  </span>
                </div>

                {/* Primary Metric: PM2.5 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px',
                    background: envStatus.environmental_parameters.severity?.bg_color || '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    cursor: onOpenPollutantInfo ? 'pointer' : 'default',
                  }}
                  onClick={() => onOpenPollutantInfo?.('pm25')}
                  title={onOpenPollutantInfo ? 'Click to inspect PM2.5 standards & health guidance' : undefined}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>FINE PARTICULATE (PM2.5) ℹ️</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: envStatus.environmental_parameters.severity?.color || '#1b4332' }}>
                      {envStatus.environmental_parameters.pm25 !== null ? envStatus.environmental_parameters.pm25 : 'N/A'}{' '}
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{envStatus.environmental_parameters.unit}</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>CPCB NAQI CATEGORY</div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: envStatus.environmental_parameters.severity?.color || '#1b4332',
                      }}
                    >
                      {envStatus.environmental_parameters.severity?.category || 'Standard'} (Tier {envStatus.environmental_parameters.severity?.severity_level || 1})
                    </div>
                  </div>
                </div>

                {/* Secondary metric: PM10 if available */}
                {envStatus.environmental_parameters.pm10 !== null && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      marginBottom: '12px',
                      cursor: onOpenPollutantInfo ? 'pointer' : 'default',
                    }}
                    onClick={() => onOpenPollutantInfo?.('pm10')}
                    title={onOpenPollutantInfo ? 'Click to inspect PM10 standards' : undefined}
                  >
                    Coarse Particulate (PM10): <strong>{envStatus.environmental_parameters.pm10} µg/m³</strong> ℹ️
                  </div>
                )}

                {/* Station & Distance Provenance with Microclimate Notice */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <div>
                    📡 <strong>Nearest Sensor:</strong> {envStatus.reference_station.name} ({envStatus.reference_station.distance_km} km from campus)
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                    <strong>Limitation Notice:</strong> {envStatus.data_provenance.limitation_notice}
                  </div>
                </div>

                {/* Statutory Disclaimer */}
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {envStatus.disclaimer}
                </div>
              </div>

              {/* Card B: Institutional Response Level & Precautions */}
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  INSTITUTIONAL RESPONSE LEVEL
                </span>
                <h3 style={{ margin: '4px 0 10px 0', fontSize: '18px', color: '#1b4332' }}>
                  {envStatus.matched_policy_tier?.title || 'Level 1: Routine Advisory'}
                </h3>
                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 12px 0' }}>
                  {envStatus.matched_policy_tier?.summary}
                </p>

                {/* Operational Actions */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>
                    Operational Campus Guidelines:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                    {envStatus.matched_policy_tier?.recommended_actions?.map((act, i) => (
                      <li key={i} style={{ marginBottom: '3px' }}>{act}</li>
                    ))}
                  </ul>
                </div>

                {/* Permitted Accommodations */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>
                    Permitted Academic Accommodations:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {envStatus.matched_policy_tier?.permitted_accommodations?.map((acc, i) => (
                      <span key={i} style={{ background: '#e8f5e9', color: '#1b4332', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', border: '1px solid #b7e4c7' }}>
                        ✓ {acc.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Verified WHO / CPCB Precautions */}
                {envStatus.precaution_guidance?.length > 0 && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>
                      WHO / CPCB Public Health Guidance:
                    </div>
                    {envStatus.precaution_guidance.slice(0, 2).map((rec) => (
                      <div key={rec.id} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', color: '#334155', marginBottom: '6px' }}>
                        <strong>{rec.title}:</strong> {rec.explanation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 4. TAB 2: Response Policies & Evaluation Workflow */}
      {activeTab === 'policies' && (
        <div className="campus-tab-policies">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b4332' }}>Institutional Environmental Response Protocols</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Configurable administrative policies correlating CPCB NAQI severity bands with campus operational actions.
                {catalog?.support_categories ? ` (${catalog.support_categories.length} registered support categories).` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={handleEvaluatePolicy}
              disabled={evaluating}
              style={{
                background: '#1b4332',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: evaluating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {evaluating ? 'Evaluating…' : '⚡ Run Policy Evaluation Workflow'}
            </button>
          </div>

          {/* Evaluation Result Card if available */}
          {evaluationResult && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                  EVALUATION RESULT (PROPOSED INSTITUTIONAL RESPONSE)
                </span>
                <span style={{ fontSize: '11px', color: '#15803d' }}>
                  Evaluated at: {new Date(evaluationResult.evaluated_at).toLocaleTimeString()}
                </span>
              </div>
              <h4 style={{ margin: '6px 0', fontSize: '16px', color: '#14532d' }}>
                {evaluationResult.proposed_response.notice_title}
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#166534' }}>
                {evaluationResult.proposed_response.advisory_text}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px', color: '#166534', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div><strong>Triggered Tier:</strong> Level {evaluationResult.triggered_policy.policy_tier} ({evaluationResult.triggered_policy.tier_name})</div>
                <div><strong>Consented Students:</strong> {evaluationResult.privacy_conscious_matching.active_consented_profiles_count} profiles</div>
                <div><strong>Eligible for Accommodation Review:</strong> {evaluationResult.privacy_conscious_matching.eligible_students_for_review_count} students</div>
                <div><strong>Human Approval Required:</strong> {evaluationResult.proposed_response.requires_human_approval ? 'YES (Mandatory)' : 'No'}</div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '11px', color: '#15803d', fontStyle: 'italic' }}>
                ⚠️ {evaluationResult.safety_advisory} (Auto-cancel: {String(evaluationResult.proposed_response.classes_automatically_cancelled)}, Auto-excusal: {String(evaluationResult.proposed_response.attendance_automatically_excused)}).
              </div>
            </div>
          )}

          {/* Policy Rules Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {policies.map((pol) => (
              <div
                key={pol.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  borderTop: `4px solid ${pol.policy_tier === 1 ? '#10b981' : pol.policy_tier === 2 ? '#f59e0b' : pol.policy_tier === 3 ? '#ef4444' : '#7c3aed'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                    LEVEL {pol.policy_tier} ({pol.tier_name.toUpperCase()})
                  </span>
                  <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    PM2.5: {pol.threshold_min}{pol.threshold_max ? `–${pol.threshold_max}` : '+'} µg/m³
                  </span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1b4332' }}>{pol.title}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{pol.summary}</p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>Permitted Accommodations:</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {pol.permitted_accommodations.map((acc, i) => (
                    <span key={i} style={{ fontSize: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
                      {acc.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 3: Voluntary Student Support Profiles & Consent (RESTRICTED PRIVACY) */}
      {activeTab === 'students' && (
        <div className="campus-tab-students">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b4332' }}>Restricted Voluntary Support Profiles</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Voluntary disclosures for environmental support needs. Strict privacy: Minimal support categories only; zero medical records or prescriptions.
              </p>
            </div>

            {(currentRole === 'support_staff' || currentRole === 'campus_admin' || currentRole === 'student') && (
              <button
                type="button"
                onClick={() => setIsStudentFormOpen(!isStudentFormOpen)}
                style={{
                  background: '#2d6a4f',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isStudentFormOpen ? 'Close Form ✕' : '+ Register Voluntary Support'}
              </button>
            )}
          </div>

          {/* Privacy Notice Banner */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem', fontSize: '12px', color: '#334155' }}>
            🔒 <strong>Institutional Privacy &amp; Consent Standard:</strong> Support profiles are stored under pseudonymized tokens. No clinical diagnoses, doctor prescriptions, or detailed medical histories are accepted or retained. Students may withdraw consent at any time to purge active accommodations.
          </div>

          {/* Student Registration Form */}
          {isStudentFormOpen && (
            <form onSubmit={handleRegisterStudent} style={{ background: '#ffffff', border: '1px solid #74c69d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1b4332' }}>Voluntary Environmental Disclosure Form</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Student Initials / Display Token:
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Student M.S."
                    required
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Academic Department:
                  </label>
                  <input
                    type="text"
                    value={newStudentDept}
                    onChange={(e) => setNewStudentDept(e.target.value)}
                    placeholder="e.g. Computer Science"
                    required
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Support Category (Minimal):
                  </label>
                  <select
                    value={newStudentCategory}
                    onChange={(e) => setNewStudentCategory(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="respiratory_sensitivity">Respiratory Sensitivity</option>
                    <option value="cardiovascular_concern">Cardiovascular Concern</option>
                    <option value="general_environmental_sensitivity">General Environmental Sensitivity</option>
                    <option value="mobility_exertion_limitation">Mobility &amp; Exertion Limitation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Accommodation Preference:
                  </label>
                  <select
                    value={newStudentAccPref}
                    onChange={(e) => setNewStudentAccPref(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="recorded_lecture">Recorded Lecture Provision</option>
                    <option value="alternative_class_slot">Alternative Class / Tutorial Slot</option>
                    <option value="remote_participation_option">Remote Participation Option</option>
                    <option value="indoor_relocation">Indoor Facility Relocation</option>
                    <option value="flexible_attendance_review">Attendance Consideration Review</option>
                  </select>
                </div>
              </div>

              {/* Consent Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1b4332', marginBottom: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newStudentConsent}
                  onChange={(e) => setNewStudentConsent(e.target.checked)}
                />
                <span>
                  <strong>Informed Consent Acknowledgment:</strong> I voluntarily disclose this accommodation preference for institutional support coordination during severe air quality events. I understand I may withdraw this consent at any time.
                </span>
              </label>

              <button
                type="submit"
                style={{ background: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Voluntary Support Profile
              </button>
            </form>
          )}

          {/* Access Control Check for General User */}
          {studentsError ? (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', padding: '1.25rem', color: '#991b1b', fontSize: '13px' }}>
              <strong>⛔ {studentsError}</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>
                To view or manage student support profiles, switch your simulated role at the top right to <strong>🛡️ Support Staff</strong> or <strong>🏛️ Campus Admin</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {students.map((stu) => (
                <div key={stu.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', opacity: stu.consent_status === 'withdrawn' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1b4332' }}>{stu.display_name}</span>
                    <span style={{ fontSize: '11px', background: stu.consent_status === 'active' ? '#dcfce7' : '#fee2e2', color: stu.consent_status === 'active' ? '#166534' : '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {stu.consent_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                    Token: <code>{stu.student_id_hash}</code> · Dept: {stu.academic_department}
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                    <strong>Category:</strong> {stu.support_category.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginBottom: '10px' }}>
                    <strong>Preferred Accommodation:</strong> {stu.accommodation_preference.replace(/_/g, ' ')}
                  </div>
                  {stu.consent_status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleWithdrawConsent(stu.student_id_hash)}
                      style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Withdraw Consent
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 4: Notice Review & Approval Workflow */}
      {activeTab === 'notices' && (
        <div className="campus-tab-notices">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b4332' }}>Campus Environmental Advisories &amp; Notices</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Draft, review, and approve campus notifications. Delivery status remains strictly distinct from approval status.
              </p>
            </div>

            {(currentRole === 'support_staff' || currentRole === 'campus_admin') && (
              <button
                type="button"
                onClick={() => setIsNoticeFormOpen(!isNoticeFormOpen)}
                style={{
                  background: '#2d6a4f',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isNoticeFormOpen ? 'Close Form ✕' : '+ Draft Campus Notice'}
              </button>
            )}
          </div>

          {/* Draft Notice Form */}
          {isNoticeFormOpen && (
            <form onSubmit={handleCreateNotice} style={{ background: '#ffffff', border: '1px solid #74c69d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1b4332' }}>Draft New Campus Environmental Notice</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Notice Title:
                  </label>
                  <input
                    type="text"
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    placeholder="e.g. Tier 3 Advisory: Very Poor Air Quality Forecast"
                    required
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                    Notice Category:
                  </label>
                  <select
                    value={newNoticeCategory}
                    onChange={(e) => setNewNoticeCategory(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="precaution_guidance">Precaution Guidance</option>
                    <option value="general_advisory">General Campus Advisory</option>
                    <option value="remote_learning_option">Remote / Hybrid Learning Option</option>
                    <option value="alternative_class">Alternative Class Section</option>
                    <option value="recorded_lecture_access">Recorded Lecture Access</option>
                    <option value="attendance_review_notice">Attendance Consideration Notice</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>
                  Advisory &amp; Accommodation Guidance Text:
                </label>
                <textarea
                  value={newNoticeAdvisory}
                  onChange={(e) => setNewNoticeAdvisory(e.target.value)}
                  placeholder="Specify air quality context, precautions, and academic accommodations approved under institutional policy..."
                  rows={3}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{ background: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft for Review
              </button>
            </form>
          )}

          {/* Notices Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {notices.map((n) => (
              <div key={n.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{n.notice_code}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: n.status === 'approved' ? '#dcfce7' : n.status === 'under_review' ? '#fef3c7' : '#f1f5f9',
                      color: n.status === 'approved' ? '#166534' : n.status === 'under_review' ? '#92400e' : '#475569',
                    }}
                  >
                    {n.status.toUpperCase()}
                  </span>
                </div>
                <h4 style={{ margin: '4px 0 8px 0', fontSize: '15px', color: '#1b4332' }}>{n.title}</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>{n.advisory_text}</p>

                {/* Accommodations */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {n.approved_accommodations?.map((acc, i) => (
                    <span key={i} style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ✓ {acc.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                {/* Roadmap Delivery Status Box */}
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#64748b', marginBottom: '12px', border: '1px dashed #cbd5e1' }}>
                  <div><strong>Delivery Channel:</strong> {n.delivery_channel}</div>
                  <div><strong>Delivery Status:</strong> {n.delivery_status} (Carrier connected: {String(n.delivery_provider_connected)})</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    *No SMS/WhatsApp messages sent. External delivery provider integration is scheduled for Feature 16.
                  </div>
                </div>

                {/* Staff Actions */}
                {n.status !== 'approved' && (currentRole === 'campus_admin' || currentRole === 'support_staff') && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleApproveNotice(n.id)}
                      style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✓ Approve Notice
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB 5: Academic Accommodations */}
      {activeTab === 'accommodations' && (
        <div className="campus-tab-accommodations">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1b4332' }}>Academic Accommodation Review Queue</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Human review workflow for alternative lecture recordings, tutorial section shifts, and attendance considerations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAccFormOpen(!isAccFormOpen)}
              style={{
                background: '#2d6a4f',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isAccFormOpen ? 'Close Form ✕' : '+ Request Accommodation'}
            </button>
          </div>

          {/* Accommodation Request Form */}
          {isAccFormOpen && (
            <form onSubmit={handleCreateAccommodation} style={{ background: '#ffffff', border: '1px solid #74c69d', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1b4332' }}>Submit Academic Accommodation Request</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>Course Code:</label>
                  <input
                    type="text"
                    value={accCourseCode}
                    onChange={(e) => setAccCourseCode(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>Accommodation Type:</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="recorded_lecture">Recorded Lecture Provision</option>
                    <option value="alternative_class_slot">Alternative Class / Tutorial Slot</option>
                    <option value="remote_participation_option">Remote Participation Option</option>
                    <option value="flexible_attendance_review">Attendance Consideration Review</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>Target Date:</label>
                  <input
                    type="date"
                    value={accDate}
                    onChange={(e) => setAccDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1b4332', marginBottom: '4px' }}>Environmental Reason:</label>
                <input
                  type="text"
                  value={accReason}
                  onChange={(e) => setAccReason(e.target.value)}
                  placeholder="e.g. High PM2.5 episode coincides with outdoor lab schedule"
                  required
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{ background: '#1b4332', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit for Staff Approval
              </button>
            </form>
          )}

          {/* Accommodations Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Code</th>
                  <th style={{ padding: '10px 14px' }}>Course</th>
                  <th style={{ padding: '10px 14px' }}>Accommodation</th>
                  <th style={{ padding: '10px 14px' }}>Target Date</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Actions / Review</th>
                </tr>
              </thead>
              <tbody>
                {accommodations.map((acc) => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{acc.request_code}</td>
                    <td style={{ padding: '10px 14px' }}>{acc.course_code}</td>
                    <td style={{ padding: '10px 14px' }}>{acc.accommodation_type.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '10px 14px' }}>{acc.target_date}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: acc.status === 'approved' ? '#dcfce7' : acc.status === 'declined' ? '#fee2e2' : '#fef3c7',
                          color: acc.status === 'approved' ? '#166534' : acc.status === 'declined' ? '#991b1b' : '#92400e',
                        }}
                      >
                        {acc.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {acc.status === 'submitted' && (currentRole === 'support_staff' || currentRole === 'campus_admin') ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleDecideAccommodation(acc.id, 'approved')}
                            style={{ background: '#166534', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecideAccommodation(acc.id, 'declined')}
                            style={{ background: '#991b1b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {acc.decision_notes || 'Pending review'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 6: Institutional Audit Trail */}
      {activeTab === 'audit' && (
        <div className="campus-tab-audit">
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1b4332' }}>Institutional Decision Audit Trail</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '12px', color: '#64748b' }}>
            Immutable audit record of institutional notice approvals, consent grants/withdrawals, and accommodation decisions.
          </p>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Actor Role</th>
                  <th style={{ padding: '10px 14px' }}>Action Type</th>
                  <th style={{ padding: '10px 14px' }}>Target</th>
                  <th style={{ padding: '10px 14px' }}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.actor_role}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px' }}>
                        {log.action_type}
                      </code>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px' }}>{log.target_entity_type}: {log.target_entity_id}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155' }}>{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
