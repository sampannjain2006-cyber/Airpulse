/**
 * AIRPULSE — Google Services Integration Modal (Feature 15)
 * Provides Google Maps Navigation, Google Calendar Event Drafts, Google Tasks/Reminders,
 * and Google Cloud / OAuth account management with strict data minimization.
 */

import React, { useState, useEffect, useId } from 'react';
import type { GoogleContextPayload, GoogleIntegrationStatusResponse } from '../types/google';
import { googleApi } from '../api/google';

interface GoogleServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'maps' | 'calendar' | 'tasks' | 'account';
  context?: GoogleContextPayload | null;
}

export const GoogleServicesModal: React.FC<GoogleServicesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'maps',
  context,
}) => {
  const originInputId = useId();
  const destInputId = useId();
  const travelModeId = useId();
  const eventTypeId = useId();
  const eventTitleId = useId();
  const eventLocationId = useId();
  const eventDateId = useId();
  const eventStartTimeId = useId();
  const eventEndTimeId = useId();
  const eventNotesId = useId();
  const taskPresetId = useId();
  const taskTitleId = useId();
  const taskDestId = useId();
  const taskDueDateId = useId();

  const [activeTab, setActiveTab] = useState<'maps' | 'calendar' | 'tasks' | 'account'>(initialTab);
  const [status, setStatus] = useState<GoogleIntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Maps state
  const [mapsOrigin, setMapsOrigin] = useState<string>('');
  const [mapsDestination, setMapsDestination] = useState<string>('');
  const [mapsTravelMode, setMapsTravelMode] = useState<string>('walking');
  const [mapsUrl, setMapsUrl] = useState<string>('');
  const [mapsLimitation, setMapsLimitation] = useState<string>('');
  const [generatingMaps, setGeneratingMaps] = useState<boolean>(false);

  // Calendar state
  const [calEventType, setCalEventType] = useState<string>('destination_visit');
  const [calTitle, setCalTitle] = useState<string>('');
  const [calDestination, setCalDestination] = useState<string>('');
  const [calPlannedDate, setCalPlannedDate] = useState<string>('');
  const [calStartTime, setCalStartTime] = useState<string>('09:00');
  const [calEndTime, setCalEndTime] = useState<string>('10:00');
  const [calNotes, setCalNotes] = useState<string>('');
  const [calUrl, setCalUrl] = useState<string>('');
  const [calIcsContent, setCalIcsContent] = useState<string>('');
  const [generatingCal, setGeneratingCal] = useState<boolean>(false);

  // Tasks state
  const [taskType, setTaskType] = useState<string>('check_destination_pollution');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDestination, setTaskDestination] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState<string>('');
  const [taskChecklist, setTaskChecklist] = useState<string[]>([]);
  const [taskCopyableText, setTaskCopyableText] = useState<string>('');
  const [taskCalReminderUrl, setTaskCalReminderUrl] = useState<string>('');
  const [taskWebUrl, setTaskWebUrl] = useState<string>('https://tasks.google.com/');
  const [generatingTask, setGeneratingTask] = useState<boolean>(false);

  // Sync tab with initialTab prop when reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Sync context when context changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (context) {
      if (context.origin) setMapsOrigin(context.origin);
      if (context.destination) {
        setMapsDestination(context.destination);
        setCalDestination(context.destination);
        setTaskDestination(context.destination);
      } else if (context.destinationName) {
        setMapsDestination(context.destinationName);
        setCalDestination(context.destinationName);
        setTaskDestination(context.destinationName);
      } else if (context.campusName) {
        setMapsDestination(context.campusName);
        setCalDestination(context.campusName);
        setTaskDestination(context.campusName);
      }

      if (context.travelMode) {
        setMapsTravelMode(context.travelMode);
      }

      if (context.plannedDate) {
        setCalPlannedDate(context.plannedDate);
        setTaskDueDate(context.plannedDate);
      }

      if (context.noticeTitle) {
        setCalTitle(`[Campus Advisory] ${context.noticeTitle}`);
        setTaskTitle(`Review Campus Advisory: ${context.noticeTitle}`);
      } else if (context.destination || context.destinationName) {
        const dest = context.destination || context.destinationName;
        setCalTitle(`AIRPULSE: Visit ${dest} & Check Air Quality`);
        setTaskTitle(`Check AQI & pack protective gear for ${dest}`);
      }
    }
  }, [isOpen, context]);

  // Fetch status on open
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);

    googleApi
      .getStatus()
      .then((res) => {
        if (!mounted) return;
        setStatus(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to fetch Google service status');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Generate Maps link whenever maps inputs change
  useEffect(() => {
    if (!isOpen || activeTab !== 'maps') return;

    if (!mapsDestination.trim()) {
      setMapsUrl('');
      return;
    }

    setGeneratingMaps(true);
    googleApi
      .getMapsUrl({
        origin: mapsOrigin.trim() || undefined,
        destination: mapsDestination.trim(),
        travelMode: mapsTravelMode,
      })
      .then((res) => {
        setMapsUrl(res.url);
        setMapsLimitation(res.limitation_notice);
        setGeneratingMaps(false);
      })
      .catch(() => {
        setGeneratingMaps(false);
      });
  }, [isOpen, activeTab, mapsOrigin, mapsDestination, mapsTravelMode]);

  // Generate Calendar draft whenever calendar inputs change
  useEffect(() => {
    if (!isOpen || activeTab !== 'calendar') return;

    setGeneratingCal(true);
    googleApi
      .getCalendarDraft({
        eventType: calEventType,
        title: calTitle || 'AIRPULSE: Air Quality & Journey Check',
        destination: calDestination || 'Delhi, India',
        plannedDate: calPlannedDate || undefined,
        startTime: calStartTime || undefined,
        endTime: calEndTime || undefined,
        pollutant: context?.pollutant || 'PM2.5',
        value: context?.value !== undefined ? context.value : undefined,
        severityCategory: context?.severityCategory,
        isForecast: context?.isForecast,
        forecastDate: context?.forecastDate,
        advisoryText: calNotes || context?.advisoryText,
      })
      .then((res) => {
        setCalUrl(res.google_calendar_url);
        setCalIcsContent(res.ics_file_content);
        setGeneratingCal(false);
      })
      .catch(() => {
        setGeneratingCal(false);
      });
  }, [
    isOpen,
    activeTab,
    calEventType,
    calTitle,
    calDestination,
    calPlannedDate,
    calStartTime,
    calEndTime,
    calNotes,
    context,
  ]);

  // Generate Task draft whenever task inputs change
  useEffect(() => {
    if (!isOpen || activeTab !== 'tasks') return;

    setGeneratingTask(true);
    googleApi
      .getTaskDraft({
        taskType,
        title: taskTitle || 'Check destination pollution before departure',
        destination: taskDestination || 'Target Destination',
        plannedDate: taskDueDate || undefined,
        pollutant: context?.pollutant || 'PM2.5',
        value: context?.value !== undefined ? context.value : undefined,
        severityCategory: context?.severityCategory,
        requiredAccessories: context?.severityCategory === 'Poor' || context?.severityCategory === 'Very Poor' || context?.severityCategory === 'Severe'
          ? ['Certified N95/FFP2 Respirator', 'Portable PM2.5 Monitor']
          : [],
      })
      .then((res) => {
        setTaskChecklist(res.structured_checklist);
        setTaskCopyableText(res.copyable_text);
        setTaskCalReminderUrl(res.calendar_reminder_url);
        setTaskWebUrl(res.google_tasks_web_url);
        setGeneratingTask(false);
      })
      .catch(() => {
        setGeneratingTask(false);
      });
  }, [isOpen, activeTab, taskType, taskTitle, taskDestination, taskDueDate, context]);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleCopyTask = () => {
    if (!taskCopyableText) return;
    navigator.clipboard
      .writeText(taskCopyableText)
      .then(() => {
        showNotification('Task checklist copied to clipboard! You can paste it into Google Tasks or Keep.', 'success');
      })
      .catch(() => {
        showNotification('Failed to copy. Please manually select and copy the text.', 'error');
      });
  };

  const handleDownloadIcs = () => {
    if (!calIcsContent) return;
    const blob = new Blob([calIcsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airpulse-event-${Date.now()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('iCalendar (.ics) file downloaded. Compatible with Google, Apple, and Outlook calendars.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="nature-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="google-modal-title">
      <div
        className="nature-modal"
        style={{
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1f18',
          border: '1px solid rgba(116, 198, 157, 0.3)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          borderRadius: '12px',
          overflow: 'hidden',
          color: '#e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            background: 'linear-gradient(135deg, #1b4332 0%, #081c15 100%)',
            borderBottom: '1px solid rgba(116, 198, 157, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🌐</span>
              <h2 id="google-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#d8f3dc' }}>
                Google Services Integration
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  background: '#2d6a4f',
                  color: '#d8f3dc',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                No Account Needed for Handoffs
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95d5b2' }}>
              Maps navigation, Google Calendar drafts, and Tasks checklists with transparent data provenance.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d8f3dc',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            aria-label="Close Google integration modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(116, 198, 157, 0.2)',
            background: '#0a1a14',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveTab('maps')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'maps' ? '#1b4332' : 'transparent',
              color: activeTab === 'maps' ? '#ffffff' : '#95d5b2',
              border: 'none',
              borderBottom: activeTab === 'maps' ? '3px solid #52b788' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🗺️</span> Google Maps
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'calendar' ? '#1b4332' : 'transparent',
              color: activeTab === 'calendar' ? '#ffffff' : '#95d5b2',
              border: 'none',
              borderBottom: activeTab === 'calendar' ? '3px solid #52b788' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>📅</span> Calendar Events
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'tasks' ? '#1b4332' : 'transparent',
              color: activeTab === 'tasks' ? '#ffffff' : '#95d5b2',
              border: 'none',
              borderBottom: activeTab === 'tasks' ? '3px solid #52b788' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>✅</span> Tasks &amp; Reminders
          </button>
          <button
            onClick={() => setActiveTab('account')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'account' ? '#1b4332' : 'transparent',
              color: activeTab === 'account' ? '#ffffff' : '#95d5b2',
              border: 'none',
              borderBottom: activeTab === 'account' ? '3px solid #52b788' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>⚙️</span> Cloud &amp; Status
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div
            style={{
              padding: '8px 16px',
              background: feedbackMsg.type === 'success' ? '#14532d' : feedbackMsg.type === 'error' ? '#7f1d1d' : '#1e3a8a',
              color: '#ffffff',
              fontSize: '12px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading && !status && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#95d5b2' }}>
              Checking Google service configurations…
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', color: '#fca5a5', marginBottom: '1rem', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: GOOGLE MAPS & NAVIGATION */}
          {activeTab === 'maps' && (
            <div className="google-tab-maps">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#d8f3dc' }}>
                  Open Route or Destination in Google Maps
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95d5b2' }}>
                  Direct official Google Maps navigation handoff supporting Walking and Bicycling priority routes.
                </p>
              </div>

              {/* Form Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor={originInputId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Origin (Optional for directions):
                  </label>
                  <input
                    id={originInputId}
                    type="text"
                    value={mapsOrigin}
                    onChange={(e) => setMapsOrigin(e.target.value)}
                    placeholder="e.g. Connaught Place, New Delhi"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={destInputId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Destination (Required):
                  </label>
                  <input
                    id={destInputId}
                    type="text"
                    value={mapsDestination}
                    onChange={(e) => setMapsDestination(e.target.value)}
                    placeholder="e.g. India Gate, New Delhi"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor={travelModeId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                  Travel Mode for Google Maps Navigation:
                </label>
                <select
                  id={travelModeId}
                  value={mapsTravelMode}
                  onChange={(e) => setMapsTravelMode(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#081c15',
                    border: '1px solid #2d6a4f',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    minWidth: '200px',
                  }}
                >
                  <option value="walking">🚶 Walking (Pedestrian Navigation)</option>
                  <option value="cycling">🚴 Bicycling (Cycling Navigation)</option>
                  <option value="transit">🚆 Transit (Bus / Metro)</option>
                  <option value="driving">🚗 Driving (Road Network)</option>
                </select>
              </div>

              {/* Statutory Limitation Callout */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fde68a',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <strong>⚠️ IMPORTANT LIMITATION:</strong>{' '}
                {mapsLimitation ||
                  'Opening a route in Google Maps uses Google standard road routing. It does NOT automatically carry AIRPULSE real-time pollution exposure scores or guarantee that Google Maps will follow the least-polluted route.'}
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                  AIRPULSE preserves your pollution-optimized route comparison within this application.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#2d6a4f',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🗺️</span> Open in Google Maps ↗
                  </a>
                ) : (
                  <button
                    disabled
                    style={{
                      background: '#1b4332',
                      color: '#6b7280',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'not-allowed',
                    }}
                  >
                    Enter Destination to Generate Map Link
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (mapsUrl) {
                      navigator.clipboard.writeText(mapsUrl);
                      showNotification('Google Maps URL copied to clipboard!', 'success');
                    }
                  }}
                  disabled={!mapsUrl || generatingMaps}
                  style={{
                    background: '#081c15',
                    color: '#95d5b2',
                    border: '1px solid #2d6a4f',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: mapsUrl ? 'pointer' : 'not-allowed',
                  }}
                >
                  📋 Copy Navigation Link
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="google-tab-calendar">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#d8f3dc' }}>
                  Add Environmental Check to Google Calendar
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95d5b2' }}>
                  Creates a prefilled Google Calendar draft without requiring OAuth account access. No sensitive health information is included.
                </p>
              </div>

              {/* Event Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor={eventTypeId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Event Purpose:
                  </label>
                  <select
                    id={eventTypeId}
                    value={calEventType}
                    onChange={(e) => setCalEventType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="destination_visit">Planned Destination Visit &amp; AQI Check</option>
                    <option value="pollution_check_reminder">Pre-Departure Air Quality Review</option>
                    <option value="forecast_review">Review 5-Day Forecast Horizon</option>
                    <option value="campus_advisory">Campus Environmental Advisory Action</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={eventTitleId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Event Title:
                  </label>
                  <input
                    id={eventTitleId}
                    type="text"
                    value={calTitle}
                    onChange={(e) => setCalTitle(e.target.value)}
                    placeholder="e.g. AIRPULSE: Check Air Quality"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor={eventLocationId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Destination / Campus:
                  </label>
                  <input
                    id={eventLocationId}
                    type="text"
                    value={calDestination}
                    onChange={(e) => setCalDestination(e.target.value)}
                    placeholder="e.g. Lodhi Garden, New Delhi"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={eventDateId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Target Date:
                  </label>
                  <input
                    id={eventDateId}
                    type="date"
                    value={calPlannedDate}
                    onChange={(e) => setCalPlannedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={eventStartTimeId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Time Window:
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      id={eventStartTimeId}
                      type="time"
                      value={calStartTime}
                      onChange={(e) => setCalStartTime(e.target.value)}
                      style={{
                        width: '50%',
                        padding: '8px 4px',
                        background: '#081c15',
                        border: '1px solid #2d6a4f',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      id={eventEndTimeId}
                      aria-label="Event End Time"
                      type="time"
                      value={calEndTime}
                      onChange={(e) => setCalEndTime(e.target.value)}
                      style={{
                        width: '50%',
                        padding: '8px 4px',
                        background: '#081c15',
                        border: '1px solid #2d6a4f',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label htmlFor={eventNotesId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                  Precaution Guidance / Notes (Auto-sanitized):
                </label>
                <textarea
                  id={eventNotesId}
                  rows={2}
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="e.g. Wear certified N95 respirator during outdoor travel if PM2.5 exceeds 90 µg/m³."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#081c15',
                    border: '1px solid #2d6a4f',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Data Provenance Badge */}
              <div
                style={{
                  background: '#081c15',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #2d6a4f',
                  marginBottom: '1.2rem',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>ℹ️</span>
                <span>
                  <strong>Data Provenance:</strong>{' '}
                  {context?.isForecast
                    ? '5-DAY FORECAST MODEL (Advance Planning Mode)'
                    : 'CURRENT GROUND MEASUREMENT (OpenAQ / CPCB)'}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {calUrl && (
                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#2d6a4f',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>📅</span> Open Prefilled Google Calendar Draft ↗
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  disabled={!calIcsContent || generatingCal}
                  style={{
                    background: '#081c15',
                    color: '#95d5b2',
                    border: '1px solid #2d6a4f',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: calIcsContent ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📥</span> Download .ics File (Apple / Outlook / Google)
                </button>
              </div>

              <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                Note: Action opens a draft for your review. The event is not added until you click &quot;Save&quot; in Google Calendar.
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE TASKS & REMINDERS */}
          {activeTab === 'tasks' && (
            <div className="google-tab-tasks">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#d8f3dc' }}>
                  Create Pollution-Aware Tasks &amp; Reminders
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95d5b2' }}>
                  Structured actionable checklists for checking air quality, reviewing forecasts, or preparing certified PPE.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor={taskPresetId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Task Template:
                  </label>
                  <select
                    id={taskPresetId}
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="check_destination_pollution">Check Destination Pollution Before Departure</option>
                    <option value="review_forecast">Review 5-Day Forecast Before Future Trip</option>
                    <option value="prepare_accessories">Prepare Certified Accessories (N95 / HEPA Filter)</option>
                    <option value="campus_guidance">Review Institutional Campus Advisory</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={taskTitleId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Task Title:
                  </label>
                  <input
                    id={taskTitleId}
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Check AQI and pack N95 respirator"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label htmlFor={taskDestId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Destination / Area:
                  </label>
                  <input
                    id={taskDestId}
                    type="text"
                    value={taskDestination}
                    onChange={(e) => setTaskDestination(e.target.value)}
                    placeholder="e.g. Anand Vihar, Delhi"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={taskDueDateId} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#74c69d', marginBottom: '4px' }}>
                    Due Date (Optional):
                  </label>
                  <input
                    id={taskDueDateId}
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#081c15',
                      border: '1px solid #2d6a4f',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Checklist Preview Box */}
              <div
                style={{
                  background: '#081c15',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2d6a4f',
                  marginBottom: '1.2rem',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#74c69d', marginBottom: '8px' }}>
                  ACTION CHECKLIST PREVIEW:
                </div>
                {taskChecklist.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyTask}
                  disabled={!taskCopyableText || generatingTask}
                  style={{
                    background: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📋</span> Copy Task Checklist to Clipboard
                </button>

                <a
                  href={taskWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#081c15',
                    color: '#95d5b2',
                    textDecoration: 'none',
                    border: '1px solid #2d6a4f',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚡</span> Open Google Tasks Web App ↗
                </a>

                {taskCalReminderUrl && (
                  <a
                    href={taskCalReminderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#081c15',
                      color: '#95d5b2',
                      textDecoration: 'none',
                      border: '1px solid #2d6a4f',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⏰</span> Open in Calendar as Reminder ↗
                  </a>
                )}
              </div>

              <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
                Note: Copying or opening drafts does not silently create tasks in Google Cloud. Direct API task creation is available when a Google Account is connected.
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE CLOUD & ACCOUNT STATUS */}
          {activeTab === 'account' && (
            <div className="google-tab-account">
              <div style={{ marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#d8f3dc' }}>
                  Google Cloud Services &amp; OAuth Status
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95d5b2' }}>
                  Transparent overview of Google APIs, OAuth configuration, and security practices.
                </p>
              </div>

              {/* Service Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ background: '#081c15', border: '1px solid #2d6a4f', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#52b788', marginBottom: '4px' }}>GOOGLE MAPS HANDOFF</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Active (No Key Needed)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Directions (walking/cycling) &amp; place search schemes active.
                  </div>
                </div>

                <div style={{ background: '#081c15', border: '1px solid #2d6a4f', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#52b788', marginBottom: '4px' }}>GOOGLE CALENDAR DRAFTS</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Active (OAuth-Free)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Prefilled template URLs &amp; RFC 5545 .ics generator active.
                  </div>
                </div>

                <div style={{ background: '#081c15', border: '1px solid #2d6a4f', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: status?.services?.oauth?.configured ? '#52b788' : '#f59e0b', marginBottom: '4px' }}>
                    DIRECT TASKS API / OAUTH
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    {status?.services?.oauth?.configured ? 'Configured in .env' : 'Fallback Mode Active'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {status?.services?.oauth?.configured
                      ? 'OAuth credentials verified.'
                      : 'Clipboard checklist & web drafts active.'}
                  </div>
                </div>
              </div>

              {/* Institutional Setup Instructions */}
              <div
                style={{
                  background: '#0a1a14',
                  border: '1px solid rgba(116, 198, 157, 0.2)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#d8f3dc', marginBottom: '8px' }}>
                  Institutional Administrator Google Cloud Setup Guide:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>Create a project in <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#52b788' }}>Google Cloud Console</a>.</li>
                  <li>Enable the <strong>Google Tasks API</strong> under APIs &amp; Services -&gt; Library.</li>
                  <li>Configure the <strong>OAuth Consent Screen</strong> with minimal scope: <code>https://www.googleapis.com/auth/tasks</code>.</li>
                  <li>Create an <strong>OAuth 2.0 Web Client ID</strong>.</li>
                  <li>Set Authorized Redirect URI: <code>http://localhost:3001/api/v1/google/auth/callback</code></li>
                  <li>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>server/.env</code> and restart server.</li>
                </ul>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                Security: No tokens or secrets are ever stored in browser localStorage or committed to Git. Tokens are managed server-side with strict TTL expiration.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
