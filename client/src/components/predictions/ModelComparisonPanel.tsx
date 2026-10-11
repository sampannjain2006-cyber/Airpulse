import type { ModelsComparisonResponse } from '../../types/prediction';

interface Props {
  comparison: ModelsComparisonResponse | null;
  selectedModel: string;
  onSelectModel: (modelKey: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ModelComparisonPanel({
  comparison,
  selectedModel,
  onSelectModel,
  isOpen,
  onToggle,
}: Props) {
  if (!comparison || !comparison.models) return null;

  const modelEntries = [
    {
      key: 'weighted_ensemble',
      name: 'Weighted Ensemble',
      family: 'Multi-Model (Inverse-MAE)',
      badge: 'Validated Best',
      isEnsemble: true,
      data: comparison.models.weighted_ensemble,
    },
    {
      key: 'hist_gradient_boosting',
      name: 'HistGradientBoosting',
      family: 'Gradient Boosting (Scikit-Learn)',
      badge: 'Candidate',
      isEnsemble: false,
      data: comparison.models.hist_gradient_boosting,
    },
    {
      key: 'random_forest',
      name: 'Random Forest',
      family: 'Bagging Ensemble (Scikit-Learn)',
      badge: 'Candidate',
      isEnsemble: false,
      data: comparison.models.random_forest,
    },
    {
      key: 'xgboost',
      name: 'XGBoost Regressor',
      family: 'Extreme Gradient Boosting',
      badge: 'Candidate',
      isEnsemble: false,
      data: comparison.models.xgboost,
    },
  ];

  return (
    <div
      className={`model-comparison-card ${isOpen ? 'expanded' : 'collapsed'}`}
      id="ml-model-validation-benchmark"
    >
      <div
        className="model-comp-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="model-comp-body-content"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="model-comp-header-left">
          <div className="model-comp-tag-row">
            <span className="model-comp-tag">ML VALIDATION BENCHMARK</span>
            <span className="model-comp-dataset-badge">
              Chronological 15% Unseen Historical Test Set
            </span>
          </div>
          <h3 className="model-comp-title">Multi-Model Performance Comparison</h3>
          <span className="model-comp-sub">
            Target Pollutant: <strong>{comparison.target || 'PM2.5 (24h Average)'}</strong> · Evaluated Across India Ground Monitoring Network
          </span>
        </div>
        <div className="model-comp-header-right">
          <div className="model-active-pill">
            <span className="model-active-pill-label">Active Forecast:</span>
            <strong className="model-active-pill-name">
              {selectedModel === 'weighted_ensemble'
                ? 'Weighted Ensemble'
                : selectedModel === 'hist_gradient_boosting'
                ? 'HistGradientBoosting'
                : selectedModel === 'random_forest'
                ? 'Random Forest'
                : 'XGBoost'}
            </strong>
          </div>
          <button
            type="button"
            className="model-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={isOpen}
          >
            {isOpen ? '▲ Hide Metrics' : '▼ Compare Models'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="model-comp-body" id="model-comp-body-content">
          <div className="model-table-wrap">
            <table
              className="model-benchmark-table"
              aria-label="Multi-Model Machine Learning Validation Benchmark Table"
            >
              <thead>
                <tr>
                  <th scope="col">Model Architecture</th>
                  <th scope="col">Type / Family</th>
                  <th scope="col">Validation MAE</th>
                  <th scope="col">Validation RMSE</th>
                  <th scope="col">R² Score</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map((m) => {
                  if (!m.data) return null;
                  const isCurrent = selectedModel === m.key;
                  return (
                    <tr
                      key={m.key}
                      className={`${isCurrent ? 'active-row' : ''} ${m.isEnsemble ? 'ensemble-row' : ''}`}
                    >
                      <td>
                        <div className="model-cell-name">
                          <strong className="model-title-text">{m.name}</strong>
                          <span className={`model-status-chip ${m.isEnsemble ? 'best' : 'candidate'}`}>
                            {m.badge}
                          </span>
                        </div>
                      </td>
                      <td className="model-cell-family">{m.family}</td>
                      <td className="model-cell-metric">
                        <span className="metric-val">{m.data.mae.toFixed(2)}</span>
                        <span className="metric-unit">µg/m³</span>
                      </td>
                      <td className="model-cell-metric">
                        <span className="metric-val">{m.data.rmse.toFixed(2)}</span>
                        <span className="metric-unit">µg/m³</span>
                      </td>
                      <td className="model-cell-metric">
                        <span className="metric-val">{(m.data.r2 * 100).toFixed(1)}%</span>
                        <span className="metric-r2-raw">({m.data.r2.toFixed(4)})</span>
                      </td>
                      <td className="model-cell-action">
                        <button
                          type="button"
                          className={`btn-select-model ${isCurrent ? 'active' : ''}`}
                          onClick={() => onSelectModel(m.key)}
                          aria-label={
                            isCurrent
                              ? `${m.name} is currently selected as active forecast model`
                              : `Switch active forecast model to ${m.name}`
                          }
                        >
                          {isCurrent ? '● Active' : 'Switch Model'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {comparison.ensemble_weights && (
            <div className="ensemble-weights-bar">
              <span className="weights-label">Validation Weights (Inverse-MAE):</span>
              <div className="weights-chips-group">
                <span className="weight-chip">
                  <span className="weight-name">XGBoost:</span>
                  <strong className="weight-num">{(comparison.ensemble_weights.xgboost * 100).toFixed(1)}%</strong>
                </span>
                <span className="weight-chip">
                  <span className="weight-name">Random Forest:</span>
                  <strong className="weight-num">{(comparison.ensemble_weights.random_forest * 100).toFixed(1)}%</strong>
                </span>
                <span className="weight-chip">
                  <span className="weight-name">HistGradientBoosting:</span>
                  <strong className="weight-num">{(comparison.ensemble_weights.hist_gradient_boosting * 100).toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          )}

          {comparison.selection_rationale && (
            <div className="model-comp-rationale">
              <span className="rationale-icon" aria-hidden="true">ℹ</span>
              <div className="rationale-content">
                <strong className="rationale-heading">Model Selection Rationale:</strong>
                <span className="rationale-text">{comparison.selection_rationale}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
