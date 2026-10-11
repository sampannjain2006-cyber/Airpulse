/**
 * AIRPULSE — Google Services Integration Modal (Feature 15)
 * Provides Google Calendar Event Drafts, Google Tasks/Reminders,
 * and Google Cloud / OAuth account management with strict data minimization.
 * (Google Maps navigation removed per requirements)
 */

import React, { useState, useEffect, useId } from 'react';
import type { GoogleContextPayload, GoogleIntegrationStatusResponse } from '../types/google';
import { googleApi } from '../api/google';

export type GoogleModalTab = 'calendar' | 'tasks' | 'account';

interface GoogleServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: GoogleModalTab;
  context?: GoogleContextPayload | null;
}

export const GoogleServicesModal: React.FC<GoogleServicesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'calendar',
  context,
}) => {
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

  const [activeTab, setActiveTab] = useState<GoogleModalTab>(initialTab);
  const [status, setStatus] = useState<GoogleIntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      if (context.destination) {
        setCalDestination(context.destination);
        setTaskDestination(context.destination);
      } else if (context.destinationName) {
        setCalDestination(context.destinationName);
        setTaskDestination(context.destinationName);
      } else if (context.campusName) {
        setCalDestination(context.campusName);
        setTaskDestination(context.campusName);
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
    <div className="nature-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="google-modal-title">
      <div
        className="nature-modal google-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="nature-modal-header google-modal-header">
          <div>
            <div className="google-modal-title-row">
              <span style={{ fontSize: '24px' }}>🌐</span>
              <h2 id="google-modal-title" className="google-modal-title">
                Google Services Integration
              </h2>
              <span className="google-modal-badge">
                No Account Needed for Handoffs
              </span>
            </div>
            <p className="google-modal-subtitle">
              Google Calendar event drafts, Tasks checklists, and cloud configuration with transparent data provenance.
            </p>
          </div>

          <button
            onClick={onClose}
            className="google-modal-close-btn"
            aria-label="Close Google integration modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="google-modal-tabs-bar" role="tablist" aria-label="Google Services Options">
          <button
            role="tab"
            aria-selected={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
            className={`google-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          >
            <span>📅</span> Calendar Events
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            className={`google-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            <span>✅</span> Tasks &amp; Reminders
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'account'}
            onClick={() => setActiveTab('account')}
            className={`google-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          >
            <span>⚙️</span> Cloud &amp; Status
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div
            style={{
              padding: '8px 16px',
              background: feedbackMsg.type === 'success' ? 'var(--color-sage-subtle)' : feedbackMsg.type === 'error' ? 'var(--color-rose-subtle)' : 'var(--color-sky-subtle)',
              color: feedbackMsg.type === 'success' ? 'var(--color-forest-dark)' : feedbackMsg.type === 'error' ? 'var(--color-rose)' : 'var(--color-sky)',
              borderBottom: '1px solid var(--color-border)',
              fontSize: '12px',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Body Content */}
        <div className="google-modal-body">
          {loading && !status && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              Checking Google service configurations…
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--color-rose-subtle)', border: '1px solid var(--color-rose)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--color-rose)', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: GOOGLE CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="google-tab-calendar">
              <div style={{ marginBottom: '1.2rem' }}>
                <h3 className="google-tab-heading">
                  Add Environmental Check to Google Calendar
                </h3>
                <p className="google-tab-subtext">
                  Draft an air-quality consultation, journey check, or outdoor advisory event. Opens directly in Google Calendar or downloads an .ics file.
                </p>
              </div>

              {/* Form Controls */}
              <div className="google-form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="google-form-group">
                  <label htmlFor={eventTypeId} className="google-form-label">
                    Event Category:
                  </label>
                  <select
                    id={eventTypeId}
                    value={calEventType}
                    onChange={(e) => setCalEventType(e.target.value)}
                    className="google-form-control"
                  >
                    <option value="destination_visit">Destination Visit &amp; Outdoor Journey</option>
                    <option value="campus_advisory">Campus Environmental Advisory</option>
                    <option value="forecast_review">Review 5-Day Pollution Forecast</option>
                    <option value="health_check">Health &amp; Vulnerable Individual Precaution</option>
                  </select>
                </div>

                <div className="google-form-group">
                  <label htmlFor={eventTitleId} className="google-form-label">
                    Event Title:
                  </label>
                  <input
                    id={eventTitleId}
                    type="text"
                    value={calTitle}
                    onChange={(e) => setCalTitle(e.target.value)}
                    placeholder="e.g. AIRPULSE: Travel to Central Delhi"
                    className="google-form-control"
                  />
                </div>
              </div>

              <div className="google-form-grid-4" style={{ marginBottom: '1rem' }}>
                <div className="google-form-group">
                  <label htmlFor={eventLocationId} className="google-form-label">
                    Location:
                  </label>
                  <input
                    id={eventLocationId}
                    type="text"
                    value={calDestination}
                    onChange={(e) => setCalDestination(e.target.value)}
                    placeholder="e.g. Connaught Place, New Delhi"
                    className="google-form-control"
                  />
                </div>

                <div className="google-form-group">
                  <label htmlFor={eventDateId} className="google-form-label">
                    Date:
                  </label>
                  <input
                    id={eventDateId}
                    type="date"
                    value={calPlannedDate}
                    onChange={(e) => setCalPlannedDate(e.target.value)}
                    className="google-form-control"
                  />
                </div>

                <div className="google-form-group">
                  <label htmlFor={eventStartTimeId} className="google-form-label">
                    Start Time:
                  </label>
                  <input
                    id={eventStartTimeId}
                    type="time"
                    value={calStartTime}
                    onChange={(e) => setCalStartTime(e.target.value)}
                    className="google-form-control"
                  />
                </div>

                <div className="google-form-group">
                  <label htmlFor={eventEndTimeId} className="google-form-label">
                    End Time:
                  </label>
                  <input
                    id={eventEndTimeId}
                    type="time"
                    value={calEndTime}
                    onChange={(e) => setCalEndTime(e.target.value)}
                    className="google-form-control"
                  />
                </div>
              </div>

              <div className="google-form-group" style={{ marginBottom: '1.2rem' }}>
                <label htmlFor={eventNotesId} className="google-form-label">
                  Advisory Notes &amp; Protective Precautions:
                </label>
                <textarea
                  id={eventNotesId}
                  rows={2}
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="e.g. Wear certified N95 respirator during outdoor travel if PM2.5 exceeds 90 µg/m³."
                  className="google-form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Data Provenance Badge */}
              <div className="google-provenance-box" style={{ marginBottom: '1.2rem' }}>
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
                    className="google-btn-primary"
                  >
                    <span>📅</span> Open Prefilled Google Calendar Draft ↗
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  disabled={!calIcsContent || generatingCal}
                  className="google-btn-secondary"
                >
                  <span>📥</span> Download .ics File (Apple / Outlook / Google)
                </button>
              </div>

              <div className="google-note-text">
                Note: Action opens a draft for your review. The event is not added until you click &quot;Save&quot; in Google Calendar.
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE TASKS & REMINDERS */}
          {activeTab === 'tasks' && (
            <div className="google-tab-tasks">
              <div style={{ marginBottom: '1.2rem' }}>
                <h3 className="google-tab-heading">
                  Create Pollution-Aware Tasks &amp; Reminders
                </h3>
                <p className="google-tab-subtext">
                  Structured actionable checklists for checking air quality, reviewing forecasts, or preparing certified PPE.
                </p>
              </div>

              <div className="google-form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="google-form-group">
                  <label htmlFor={taskPresetId} className="google-form-label">
                    Task Template:
                  </label>
                  <select
                    id={taskPresetId}
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="google-form-control"
                  >
                    <option value="check_destination_pollution">Check Destination Pollution Before Departure</option>
                    <option value="review_forecast">Review 5-Day Forecast Before Future Trip</option>
                    <option value="prepare_accessories">Prepare Certified Accessories (N95 / HEPA Filter)</option>
                    <option value="campus_guidance">Review Institutional Campus Advisory</option>
                  </select>
                </div>

                <div className="google-form-group">
                  <label htmlFor={taskTitleId} className="google-form-label">
                    Task Title:
                  </label>
                  <input
                    id={taskTitleId}
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Check AQI and pack N95 respirator"
                    className="google-form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '1rem' }}>
                <div className="google-form-group">
                  <label htmlFor={taskDestId} className="google-form-label">
                    Destination / Area:
                  </label>
                  <input
                    id={taskDestId}
                    type="text"
                    value={taskDestination}
                    onChange={(e) => setTaskDestination(e.target.value)}
                    placeholder="e.g. Anand Vihar, Delhi"
                    className="google-form-control"
                  />
                </div>

                <div className="google-form-group">
                  <label htmlFor={taskDueDateId} className="google-form-label">
                    Due Date (Optional):
                  </label>
                  <input
                    id={taskDueDateId}
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="google-form-control"
                  />
                </div>
              </div>

              {/* Checklist Preview Box */}
              <div className="google-checklist-box" style={{ marginBottom: '1.2rem' }}>
                <div className="google-checklist-title">
                  ACTION CHECKLIST PREVIEW:
                </div>
                {taskChecklist.map((item, idx) => (
                  <div key={idx} className="google-checklist-item">
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
                  className="google-btn-primary"
                >
                  <span>📋</span> Copy Task Checklist to Clipboard
                </button>

                <a
                  href={taskWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-btn-secondary"
                >
                  <span>⚡</span> Open Google Tasks Web App ↗
                </a>

                {taskCalReminderUrl && (
                  <a
                    href={taskCalReminderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="google-btn-secondary"
                  >
                    <span>⏰</span> Open in Calendar as Reminder ↗
                  </a>
                )}
              </div>

              <div className="google-note-text">
                Note: Copying or opening drafts does not silently create tasks in Google Cloud. Direct API task creation is available when a Google Account is connected.
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE CLOUD & ACCOUNT STATUS */}
          {activeTab === 'account' && (
            <div className="google-tab-account">
              <div style={{ marginBottom: '1.2rem' }}>
                <h3 className="google-tab-heading">
                  Google Cloud Services &amp; OAuth Status
                </h3>
                <p className="google-tab-subtext">
                  Transparent overview of Google APIs, OAuth configuration, and security practices.
                </p>
              </div>

              {/* Service Status Cards */}
              <div className="google-status-cards-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="google-status-card">
                  <div className="google-status-card-header">GOOGLE CALENDAR DRAFTS</div>
                  <div className="google-status-card-val">Active (OAuth-Free)</div>
                  <div className="google-status-card-hint">
                    Prefilled template URLs &amp; RFC 5545 .ics generator active.
                  </div>
                </div>

                <div className="google-status-card">
                  <div className="google-status-card-header">DIRECT TASKS API / OAUTH</div>
                  <div className="google-status-card-val">
                    {status?.services?.oauth?.configured ? 'Configured in .env' : 'Fallback Mode Active'}
                  </div>
                  <div className="google-status-card-hint">
                    {status?.services?.oauth?.configured
                      ? 'OAuth credentials verified.'
                      : 'Clipboard checklist & web drafts active.'}
                  </div>
                </div>
              </div>

              {/* Institutional Setup Instructions */}
              <div className="google-guide-box" style={{ marginBottom: '1rem' }}>
                <h4>
                  Institutional Administrator Google Cloud Setup Guide:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>Create a project in <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-forest-light)' }}>Google Cloud Console</a>.</li>
                  <li>Enable the <strong>Google Tasks API</strong> under APIs &amp; Services -&gt; Library.</li>
                  <li>Configure the <strong>OAuth Consent Screen</strong> with minimal scope: <code>https://www.googleapis.com/auth/tasks</code>.</li>
                  <li>Create an <strong>OAuth 2.0 Web Client ID</strong>.</li>
                  <li>Set Authorized Redirect URI: <code>http://localhost:3001/api/v1/google/auth/callback</code></li>
                  <li>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>server/.env</code> and restart server.</li>
                </ul>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Security: No tokens or secrets are ever stored in browser localStorage or committed to Git. Tokens are managed server-side with strict TTL expiration.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
