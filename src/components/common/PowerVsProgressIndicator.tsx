import React, { useState, useEffect, useRef } from 'react';
import { ProgressBar, Button, InlineNotification } from '@carbon/react';
import {
  CheckmarkFilled,
  InProgress,
  CircleDash,
  ErrorFilled,
  StopFilled,
} from '@carbon/icons-react';
import { usePowerVsData } from '@/contexts/PowerVsDataContext';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

type StepStatus = 'complete' | 'in-progress' | 'pending' | 'error';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

function getPvsSteps(
  currentResource: string,
  collectionStatus: string,
): Step[] {
  const phases = ['Authenticating', 'Workspace Discovery', 'Resource Collection', 'Complete'];

  const phaseIndex = (cr: string): number => {
    if (cr.startsWith('Authenticat')) return 0;
    if (cr.includes('workspace') || cr.includes('Workspace') || cr.includes('Discovery')) return 1;
    if (cr || collectionStatus === 'collecting') return 2;
    return 0;
  };

  let activeIndex = -1;
  if (collectionStatus === 'collecting') {
    activeIndex = phaseIndex(currentResource);
  } else if (collectionStatus === 'complete') {
    activeIndex = 4;
  } else if (collectionStatus === 'error') {
    activeIndex = phaseIndex(currentResource);
  }

  return phases.map((label, i) => {
    let status: StepStatus = 'pending';
    if (collectionStatus === 'error' && i === activeIndex) {
      status = 'error';
    } else if (i < activeIndex) {
      status = 'complete';
    } else if (i === activeIndex) {
      status = collectionStatus === 'complete' ? 'complete' : 'in-progress';
    }
    return { id: label, label, status };
  });
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'complete':
      return <CheckmarkFilled size={24} style={{ color: 'var(--cds-link-primary, #0f62fe)' }} />;
    case 'in-progress':
      return (
        <span className="step-icon--spinning">
          <InProgress size={24} style={{ color: 'var(--cds-link-primary, #0f62fe)' }} />
        </span>
      );
    case 'error':
      return <ErrorFilled size={24} style={{ color: 'var(--cds-support-error, #da1e28)' }} />;
    case 'pending':
    default:
      return <CircleDash size={24} style={{ color: 'var(--cds-text-disabled, #a8a8a8)' }} />;
  }
}

interface PowerVsProgressIndicatorProps {
  onCancel: () => void;
}

const PowerVsProgressIndicator: React.FC<PowerVsProgressIndicatorProps> = ({ onCancel }) => {
  const { pvsCollectionStatus, pvsProgress, pvsErrors, pvsCollectionDuration } = usePowerVsData();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (pvsCollectionStatus === 'collecting') {
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    startTimeRef.current = null;
  }, [pvsCollectionStatus]);

  if (pvsCollectionStatus === 'idle') return null;

  if (pvsCollectionStatus === 'complete') {
    const durationText = pvsCollectionDuration
      ? `${(pvsCollectionDuration / 1000).toFixed(1)}s`
      : '';
    return (
      <InlineNotification
        kind="success"
        title="PowerVS collection complete"
        subtitle={`All PowerVS resources collected successfully${durationText ? ` in ${durationText}` : ''}.${pvsErrors.length > 0 ? ` ${pvsErrors.length} warning(s).` : ''}`}
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  if (pvsCollectionStatus === 'error') {
    return (
      <InlineNotification
        kind="error"
        title="PowerVS collection failed"
        subtitle={pvsErrors.length > 0 ? pvsErrors[pvsErrors.length - 1].message : 'An error occurred during PowerVS data collection.'}
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  if (pvsCollectionStatus === 'cancelled') {
    return (
      <InlineNotification
        kind="warning"
        title="PowerVS collection cancelled"
        subtitle="PowerVS data collection was cancelled. Partial data may be available."
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  // Collecting state
  const steps = getPvsSteps(pvsProgress.currentResource, pvsCollectionStatus);

  const percentage = pvsProgress.total > 0
    ? Math.round((pvsProgress.completed / pvsProgress.total) * 100)
    : 0;

  const statusText = pvsProgress.currentResource
    ? `Collecting: ${pvsProgress.currentResource}`
    : pvsProgress.completed > 0
      ? `${pvsProgress.completed} of ${pvsProgress.total} resources collected`
      : 'Initializing...';

  let etaText = '';
  if (percentage > 5 && elapsedSeconds > 2) {
    const estimatedTotal = elapsedSeconds / (percentage / 100);
    const remaining = Math.max(0, Math.round(estimatedTotal - elapsedSeconds));
    etaText = `ETA: ${formatElapsed(remaining)}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <StepIcon status={step.status} />
              <span style={{
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                color: step.status === 'pending' ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
                fontWeight: step.status === 'in-progress' ? 600 : 400,
              }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                maxWidth: 60,
                background: step.status === 'complete'
                  ? 'var(--cds-link-primary, #0f62fe)'
                  : 'var(--cds-border-subtle, #e0e0e0)',
                alignSelf: 'flex-start',
                marginTop: 12,
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
            {pvsProgress.currentResource || 'Starting PowerVS collection...'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            {statusText}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            Elapsed: {formatElapsed(elapsedSeconds)}
          </span>
          {etaText && (
            <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {etaText}
            </span>
          )}
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={StopFilled}
            iconDescription="Cancel PowerVS collection"
            tooltipPosition="left"
            onClick={onCancel}
          />
        </div>
      </div>

      <ProgressBar
        value={percentage}
        label={`${percentage}% complete`}
        helperText={pvsProgress.total > 0 ? `${pvsProgress.completed} / ${pvsProgress.total} resources` : 'Starting...'}
      />
    </div>
  );
};

export default PowerVsProgressIndicator;
