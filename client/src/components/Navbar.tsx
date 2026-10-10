import React, { useState, useEffect } from 'react';
import type { SystemStatus } from '../types/meta';
import { metaApi } from '../api/meta';

export type AppView =
  | 'overview'
  | 'live'
  | 'historical'
  | 'forecast'
  | 'hotspots'
  | 'pollutants'
  | 'registry'
  | 'coordinates';

interface NavbarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  stationCount: number;
  activeReadingCount: number;
  lastUpdatedText?: string;
  onOpenLookup?: () => void;
  onOpenRegistry?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  stationCount,
  activeReadingCount,
  lastUpdatedText,
}) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = () => {
      metaApi
        .getStatus()
        .then((res) => {
          if (mounted) setSystemStatus(res);
        })
        .catch(() => {
          if (mounted) {
            setSystemStatus({
              status: 'degraded',
              service: 'airpulse-api',
              version: '0.1.0',
              timestamp: new Date().toISOString(),
              database: {
                status: 'error',
                postgis: { available: false },
              },
            });
          }
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems: Array<{ id: AppView; label: string; icon: string; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: '🌿' },
    { id: 'live', label: 'Live Monitoring', icon: '📍', count: stationCount },
    { id: 'historical', label: 'Historical Trends', icon: '📈' },
    { id: 'forecast', label: 'Forecasts', icon: '🔮' },
    { id: 'hotspots', label: 'Hotspots', icon: '🔥' },
    { id: 'pollutants', label: 'Pollutant Guide', icon: '📖' },
  ];

  const isDbConnected = systemStatus?.database?.status === 'connected';

  return (
    <header className="nature-header" role="banner">
      <div className="nature-header-container">
        {/* Brand Area */}
        <div className="nature-brand" onClick={() => onViewChange('overview')} role="button" tabIndex={0}>
          <div className="nature-brand-icon-wrap" aria-hidden="true">
            <svg
              className="nature-brand-leaf-svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div className="nature-brand-text">
            <div className="nature-brand-title-row">
              <span className="nature-brand-title">AirPulse</span>
              <span className="nature-brand-badge">India</span>
            </div>
            <span className="nature-brand-subtitle">Environmental Intelligence</span>
          </div>
        </div>

        {/* Primary Desktop Navigation */}
        <nav className="nature-nav-desktop" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`nature-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onViewChange(item.id);
                  setMobileMenuOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="nav-item-badge">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Header Right Status & Tools */}
        <div className="nature-header-actions">
          {/* Freshness / Telemetry Badge */}
          <div className="nature-pill telemetry-freshness-pill" title="Telemetry data freshness status">
            <span className="pulse-indicator healthy" aria-hidden="true" />
            <span className="pill-text">
              {activeReadingCount} Active Feeds
            </span>
            {lastUpdatedText && (
              <span className="pill-subtext hidden-mobile">· {lastUpdatedText}</span>
            )}
          </div>

          {/* Backend Connection Health */}
          <div
            className={`nature-pill connection-pill ${isDbConnected ? 'connected' : 'error'}`}
            title={`Backend: ${systemStatus?.service || 'Connecting...'} | Database: ${systemStatus?.database?.status || 'Unknown'} (PostGIS ${systemStatus?.database?.postgis?.available ? 'Active' : 'N/A'})`}
          >
            <span
              className={`status-dot ${isDbConnected ? 'online' : 'offline'}`}
              aria-hidden="true"
            />
            <span className="connection-text">
              {isDbConnected ? 'PostGIS Active' : 'Connecting...'}
            </span>
          </div>

          {/* Tools Menu (Geo Lookup & OpenAQ) */}
          <div className="nature-tools-menu-wrap">
            <button
              className={`nature-btn-tool ${currentView === 'registry' || currentView === 'coordinates' ? 'active' : ''}`}
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              aria-expanded={toolsDropdownOpen}
              aria-haspopup="true"
              title="Spatial Tools: Geographic lookup & OpenAQ Registry"
            >
              <span>Tools</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {toolsDropdownOpen && (
              <div
                className="nature-dropdown-menu"
                role="menu"
                onMouseLeave={() => setToolsDropdownOpen(false)}
              >
                <button
                  className={`dropdown-item ${currentView === 'coordinates' ? 'active-item' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setToolsDropdownOpen(false);
                    onViewChange('coordinates');
                  }}
                >
                  <span className="dropdown-item-icon">📍</span>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">Lat / Lon Lookup</span>
                    <span className="dropdown-item-desc">Resolve coordinates &amp; PostGIS proximity</span>
                  </div>
                </button>
                <button
                  className={`dropdown-item ${currentView === 'registry' ? 'active-item' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setToolsDropdownOpen(false);
                    onViewChange('registry');
                  }}
                >
                  <span className="dropdown-item-icon">🌐</span>
                  <div className="dropdown-item-content">
                    <span className="dropdown-item-title">OpenAQ Registry</span>
                    <span className="dropdown-item-desc">Explore Indian monitoring stations catalog</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            className="nature-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="nature-mobile-drawer" role="dialog" aria-modal="true">
          <nav className="nature-mobile-nav">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  className={`nature-mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span className="nav-item-label">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="nav-item-badge">{item.count}</span>
                  )}
                </button>
              );
            })}

            <div className="mobile-tools-section">
              <span className="mobile-tools-heading">Analytical Tools</span>
              <button
                className={`nature-mobile-nav-link secondary ${currentView === 'coordinates' ? 'active' : ''}`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onViewChange('coordinates');
                }}
              >
                <span className="nav-item-icon">📍</span>
                <span>Lat / Lon Proximity Lookup</span>
              </button>
              <button
                className={`nature-mobile-nav-link secondary ${currentView === 'registry' ? 'active' : ''}`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onViewChange('registry');
                }}
              >
                <span className="nav-item-icon">🌐</span>
                <span>OpenAQ Network Registry</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
