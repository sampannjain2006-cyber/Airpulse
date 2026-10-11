import React, { useState, useEffect, useRef } from 'react';
import type { SystemStatus } from '../types/meta';
import { metaApi } from '../api/meta';
import { useTheme, THEME_OPTIONS } from '../context/ThemeContext';

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
  onToggleAlerts?: () => void;
  alertCount?: number;
  alertsLoading?: boolean;
  onOpenRecommendations?: () => void;
  onOpenWasteReuse?: () => void;
  onOpenStore?: () => void;
  onToggleRoutePlanner?: () => void;
  activeRoutePlanCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  stationCount,
  activeReadingCount: _activeReadingCount,
  lastUpdatedText: _lastUpdatedText,
  onToggleAlerts,
  alertCount,
  alertsLoading,
  onOpenRecommendations,
  onOpenWasteReuse,
  onOpenStore,
  onToggleRoutePlanner,
  activeRoutePlanCount,
}) => {
  const [, setSystemStatus] = useState<SystemStatus | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const { theme, setTheme } = useTheme();

  const toolsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Preserve underlying background health check & PostGIS status API polling
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

  // Close menus on click outside & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolsDropdownOpen(false);
        setThemeDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolsRef.current && !toolsRef.current.contains(target)) {
        setToolsDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(target)) {
        setThemeDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Primary navigation views in requested order
  const primaryNavItems: Array<{ id: AppView; label: string; icon: string; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: '🌿' },
    { id: 'live', label: 'Live Monitoring', icon: '📍', count: stationCount },
    { id: 'historical', label: 'Historical Trends', icon: '📈' },
    { id: 'forecast', label: 'Forecasts', icon: '🔮' },
    { id: 'hotspots', label: 'Hotspots', icon: '🔥' },
    { id: 'pollutants', label: 'Pollutant Guide', icon: '📖' },
  ];

  return (
    <header className="nature-header" role="banner">
      <div className="nature-header-container">
        {/* 1. AirPulse Logo & Branding */}
        <div
          className="nature-brand"
          onClick={() => onViewChange('overview')}
          role="button"
          tabIndex={0}
          aria-label="AirPulse Home - Go to Overview"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onViewChange('overview');
            }
          }}
        >
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

        {/* Primary Desktop Navigation (Exact order: 2. Overview through 11. Theme) */}
        <nav className="nature-nav-desktop" aria-label="Main Navigation">
          {/* 2 to 7: Primary Views */}
          {primaryNavItems.map((item) => {
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

          {/* 8. Alerts */}
          {onToggleAlerts && (
            <button
              className={`nature-nav-link nav-item-alerts ${(alertCount || 0) > 0 ? 'has-active-alerts' : ''}`}
              onClick={onToggleAlerts}
              title="Automated Environmental Alerts & Threshold Monitoring (CPCB NAQI Standards)"
              aria-label={`Environmental Alerts: ${alertCount || 0} active`}
            >
              <span className="nav-item-icon" aria-hidden="true">🚨</span>
              <span className="nav-item-label">
                {alertsLoading ? 'Scanning…' : 'Alerts'}
              </span>
              {alertCount !== undefined && alertCount > 0 && (
                <span className="nav-item-badge alert-count-badge">{alertCount}</span>
              )}
            </button>
          )}

          {/* 9. Precautions */}
          {onOpenRecommendations && (
            <button
              className="nature-nav-link nav-item-precautions"
              onClick={onOpenRecommendations}
              title="Context-Aware Environmental Precaution Recommendations (WHO & CPCB Guidance)"
              aria-label="View Recommended Health Precautions"
            >
              <span className="nav-item-icon" aria-hidden="true">🛡</span>
              <span className="nav-item-label">Precautions</span>
            </button>
          )}

          {/* 10. Tools Dropdown */}
          <div className="nature-tools-menu-wrap" ref={toolsRef}>
            <button
              className={`nature-nav-link nature-btn-tool ${currentView === 'registry' || currentView === 'coordinates' ? 'active' : ''}`}
              onClick={() => {
                setToolsDropdownOpen(!toolsDropdownOpen);
                setThemeDropdownOpen(false);
              }}
              aria-expanded={toolsDropdownOpen}
              aria-haspopup="true"
              title="Spatial Tools: Geographic lookup, OpenAQ Registry, Waste Reuse, Store, Route Planner"
            >
              <span className="nav-item-icon" aria-hidden="true">🛠</span>
              <span className="nav-item-label">Tools</span>
              <svg className="dropdown-caret-svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {toolsDropdownOpen && (
              <div
                className="nature-dropdown-menu"
                role="menu"
                aria-label="Spatial and Impact Tools Menu"
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
                {onOpenWasteReuse && (
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onOpenWasteReuse();
                    }}
                  >
                    <span className="dropdown-item-icon">🏭</span>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">Industrial Waste Reuse</span>
                      <span className="dropdown-item-desc">CPCB circular by-product reuse catalog</span>
                    </div>
                  </button>
                )}
                {onOpenStore && (
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onOpenStore();
                    }}
                  >
                    <span className="dropdown-item-icon">🛍</span>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">Protection Store</span>
                      <span className="dropdown-item-desc">Certified PPE, air purifiers &amp; travel gear</span>
                    </div>
                  </button>
                )}
                {onToggleRoutePlanner && (
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onToggleRoutePlanner();
                    }}
                  >
                    <span className="dropdown-item-icon">🗺</span>
                    <div className="dropdown-item-content">
                      <span className="dropdown-item-title">Route Planner</span>
                      <span className="dropdown-item-desc">
                        {activeRoutePlanCount ? `${activeRoutePlanCount} routes active` : 'Pollution-aware walking & cycling routes'}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 11. Theme Switcher (Immediately after Tools) */}
          <div className="nature-theme-menu-wrap" ref={themeRef}>
            <button
              className={`nature-nav-link nav-btn-theme ${themeDropdownOpen ? 'theme-active' : ''}`}
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setToolsDropdownOpen(false);
              }}
              aria-expanded={themeDropdownOpen}
              aria-haspopup="true"
              title="Global Application Theme Switcher"
              aria-label="Switch Theme"
            >
              <span className="nav-item-icon" aria-hidden="true">🎨</span>
              <span className="nav-item-label">Theme</span>
              <svg className="dropdown-caret-svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {themeDropdownOpen && (
              <div
                className="nature-dropdown-menu nature-theme-dropdown-menu"
                role="menu"
                aria-label="Select Application Theme"
              >
                <div className="theme-menu-header">
                  <span className="theme-menu-title">APPLICATION THEME</span>
                </div>
                {THEME_OPTIONS.map((opt) => {
                  const isSelected = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`theme-dropdown-item ${isSelected ? 'active-theme-item' : ''}`}
                      role="menuitem"
                      onClick={() => {
                        setTheme(opt.id);
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <div className="theme-color-swatches" aria-hidden="true">
                        <span className="theme-swatch" style={{ background: opt.previewColors[0] }} />
                        <span className="theme-swatch" style={{ background: opt.previewColors[1] }} />
                        <span className="theme-swatch" style={{ background: opt.previewColors[2] }} />
                      </div>
                      <div className="theme-item-details">
                        <div className="theme-item-name-row">
                          <span className="theme-item-name">{opt.name}</span>
                          {isSelected && <span className="theme-selected-badge">✓ Active</span>}
                        </div>
                        <span className="theme-item-desc">{opt.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

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

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="nature-mobile-drawer" role="dialog" aria-modal="true">
          <nav className="nature-mobile-nav">
            {/* Primary navigation items 2 through 7 */}
            {primaryNavItems.map((item) => {
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

            {/* 8. Alerts */}
            {onToggleAlerts && (
              <button
                className="nature-mobile-nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onToggleAlerts();
                }}
              >
                <span className="nav-item-icon">🚨</span>
                <span>Environmental Alerts ({alertCount || 0})</span>
              </button>
            )}

            {/* 9. Precautions */}
            {onOpenRecommendations && (
              <button
                className="nature-mobile-nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRecommendations();
                }}
              >
                <span className="nav-item-icon">🛡</span>
                <span>Health Precautions &amp; Actions</span>
              </button>
            )}

            {/* 10. Tools Section */}
            <div className="mobile-tools-section">
              <span className="mobile-tools-heading">Analytical &amp; Impact Tools</span>
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

              {onOpenWasteReuse && (
                <button
                  className="nature-mobile-nav-link secondary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenWasteReuse();
                  }}
                >
                  <span className="nav-item-icon">🏭</span>
                  <span>Industrial Waste Reuse</span>
                </button>
              )}

              {onOpenStore && (
                <button
                  className="nature-mobile-nav-link secondary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenStore();
                  }}
                >
                  <span className="nav-item-icon">🛍</span>
                  <span>Protection Store</span>
                </button>
              )}

              {onToggleRoutePlanner && (
                <button
                  className="nature-mobile-nav-link secondary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onToggleRoutePlanner();
                  }}
                >
                  <span className="nav-item-icon">🗺</span>
                  <span>Route Planner</span>
                </button>
              )}
            </div>

            {/* 11. Theme Selection Section in Mobile */}
            <div className="mobile-tools-section">
              <span className="mobile-tools-heading">Application Theme</span>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`nature-mobile-nav-link secondary ${theme === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(opt.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="nav-item-icon">🎨</span>
                  <span>{opt.name} {theme === opt.id ? '✓' : ''}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
