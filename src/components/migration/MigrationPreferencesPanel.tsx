import React from 'react';
import {
  Select,
  SelectItem,
  Tooltip,
  NumberInput,
  Button,
} from '@carbon/react';
import { Play } from '@carbon/icons-react';
import type { MigrationPreferences } from '@/types/migration';
import { VPC_REGIONS } from '@/services/migration/data/datacenterMapping';

interface Props {
  preferences: MigrationPreferences;
  onPreferencesChange: (prefs: MigrationPreferences) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  hasData: boolean;
}

const MigrationPreferencesPanel: React.FC<Props> = ({
  preferences,
  onPreferencesChange,
  onRunAnalysis,
  isRunning,
  hasData,
}) => {
  const update = (partial: Partial<MigrationPreferences>) => {
    onPreferencesChange({ ...preferences, ...partial });
  };

  return (
    <div className="migration-preferences">
      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
        Migration Preferences
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Select
          id="target-region"
          labelText="Target VPC Region"
          value={preferences.targetRegion}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => update({ targetRegion: e.target.value })}
        >
          {VPC_REGIONS.map((r) => (
            <SelectItem key={r.value} value={r.value} text={r.label} />
          ))}
        </Select>

        <Tooltip label="Optional maximum acceptable monthly VPC cost. Migration recommendations respect this limit." align="bottom">
          <div>
            <NumberInput
              id="budget-constraint"
              label="Monthly Budget Limit ($)"
              value={preferences.budgetConstraint ?? 0}
              min={0}
              step={100}
              onChange={(_e: React.SyntheticEvent, { value }: { value: string | number }) => {
                const n = typeof value === 'number' ? value : Number(value);
                update({ budgetConstraint: n > 0 ? n : undefined });
              }}
              allowEmpty
            />
          </div>
        </Tooltip>
      </div>

      <Button
        renderIcon={Play}
        onClick={onRunAnalysis}
        disabled={isRunning || !hasData}
        size="md"
      >
        {isRunning ? 'Analysing...' : 'Run Migration Analysis'}
      </Button>

      {!hasData && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--cds-text-helper)' }}>
          Collect or import data first to run the analysis.
        </p>
      )}
    </div>
  );
};

export default MigrationPreferencesPanel;
