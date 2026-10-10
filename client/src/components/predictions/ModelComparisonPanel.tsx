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
    <div className={`model-comparison-card ${isOpen ? 'expanded' : 'collapsed'}`}>
      <div className="model-comp-header" onClick={onToggle}>
        <div className="model-comp-header-left">
          <span className="model-comp-tag">ML VALIDATION BENCHMARK</span>
          <h4 className="model-comp-title">Multi-Model Performance Comparison</h4>
          <span className="model-comp-sub">
            Chronological 15% Unseen Historical Test Set · Target: {comparison.target}
          </span>
        </div>
        <div className="model-comp-header-right">
          <span className="model-active-pill">
            Active Forecast:{' '}
            <strong>
              {selectedModel === 'weighted_ensemble'
                ? 'Weighted Ensemble'
                : selectedModel === 'hist_gradient_boosting'
                ? 'HistGradientBoosting'
                : selectedModel === 'random_forest'
                ? 'Random Forest'
                : 'XGBoost'}
            </strong>
          </span>
          <button type="button" className="model-toggle-btn">
            {isOpen ? '▲ Hide Metrics' : '▼ Compare Models'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="model-comp-body">
          <div className="model-table-wrap">
            <table className="model-benchmark-table">
              <thead>
                <tr>
                  <th>Model Architecture</th>
                  <th>Type / Family</th>
                  <th>Validation MAE</th>
                  <th>Validation RMSE</th>
                  <th>R² Score</th>
                  <th>Action</th>
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
                          <span className="model-title-text">{m.name}</span>
                          <span className={`model-status-chip ${m.isEnsemble ? 'best' : ''}`}>
                            {m.badge}
                          </span>
                        </div>
                      </td>
                      <td className="model-cell-family">{m.family}</td>
                      <td className="model-cell-metric">
                        <strong className="metric-val">{m.data.mae.toFixed(2)}</strong> µg/m³
                      </td>
                      <td className="model-cell-metric">
                        <strong className="metric-val">{m.data.rmse.toFixed(2)}</strong> µg/m³
                      </td>
                      <td className="model-cell-metric">
                        <strong className="metric-val">{(m.data.r2 * 100).toFixed(1)}%</strong> ({m.data.r2.toFixed(4)})
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn-select-model ${isCurrent ? 'active' : ''}`}
                          onClick={() => onSelectModel(m.key)}
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
              <span className="weights-label">Validation Weights:</span>
              <span className="weight-chip">
                XGBoost: {(comparison.ensemble_weights.xgboost * 100).toFixed(1)}%
              </span>
              <span className="weight-chip">
                Random Forest: {(comparison.ensemble_weights.random_forest * 100).toFixed(1)}%
              </span>
              <span className="weight-chip">
                HistGradientBoosting: {(comparison.ensemble_weights.hist_gradient_boosting * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <div className="model-comp-rationale">
            <span className="rationale-icon">ℹ</span>
            <span className="rationale-text">{comparison.selection_rationale}</span>
          </div>
        </div>
      )}
    </div>
  );
}
