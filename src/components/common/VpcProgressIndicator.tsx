import React, { useState, useRef, useEffect } from 'react';
import { ProgressBar, Button, InlineNotification, Tooltip } from '@carbon/react';
import {
  CheckmarkFilled,
  InProgress,
  CircleDash,
  ErrorFilled,
  StopFilled,
} from '@carbon/icons-react';
import { useVpcData } from '@/contexts/VpcDataContext';

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

function getVpcSteps(
  phase: string,
  collectionStatus: string,
  hasErrors: boolean,
): Step[] {
  const phases = ['Authenticating', 'Region Discovery', 'VPC Collection', 'Processing', 'Complete'];

  const phaseToIndex = (p: string): number => {
    if (p.startsWith('VPC Authentication') || p.startsWith('Authenticat')) return 0;
    if (p.startsWith('VPC Region Discovery') || p.startsWith('Region')) return 1;
    if (p.startsWith('VPC Collection') || p.startsWith('Collecting')) return 2;
    if (p.startsWith('Processing')) return 3;
    return 0;
  };

  let activeIndex = -1;
  if (collectionStatus === 'collecting') {
    activeIndex = phaseToIndex(phase);
  } else if (collectionStatus === 'complete') {
    activeIndex = 5; // All complete
  } else if (collectionStatus === 'error') {
    activeIndex = phaseToIndex(phase);
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
    if (collectionStatus === 'complete' && hasErrors && i === phases.length - 1) {
      status = 'complete';
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

const vpcStepTooltips: Record<string, string> = {
  'Region Discovery': 'Discovering all available VPC regions',
  'VPC Collection': 'Collecting resources across all discovered regions',
  'Processing': 'Aggregating and linking collected VPC resources',
};

interface VpcProgressIndicatorProps {
  onCancel: () => void;
}

const VpcProgressIndicator: React.FC<VpcProgressIndicatorProps> = ({ onCancel }) => {
  const { vpcCollectionStatus, vpcProgress, vpcErrors, vpcCollectionDuration } = useVpcData();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (vpcCollectionStatus === 'collecting') {
      const startTime = Date.now();
      startTimeRef.current = startTime;
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => {
        clearInterval(interval);
        startTimeRef.current = null;
      };
    }
  }, [vpcCollectionStatus]);

  if (vpcCollectionStatus === 'idle') {
    return null;
  }

  if (vpcCollectionStatus === 'complete') {
    const durationText = vpcCollectionDuration
      ? `${(vpcCollectionDuration / 1000).toFixed(1)}s`
      : '';
    return (
      <InlineNotification
        kind="success"
        title="VPC collection complete"
        subtitle={`All VPC resources collected successfully${durationText ? ` in ${durationText}` : ''}.${vpcErrors.length > 0 ? ` ${vpcErrors.length} warning(s).` : ''}`}
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  if (vpcCollectionStatus === 'error') {
    return (
      <InlineNotification
        kind="error"
        title="VPC collection failed"
        subtitle={vpcErrors.length > 0 ? vpcErrors[vpcErrors.length - 1].message : 'An error occurred during VPC data collection.'}
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  if (vpcCollectionStatus === 'cancelled') {
    return (
      <InlineNotification
        kind="warning"
        title="VPC collection cancelled"
        subtitle="VPC data collection was cancelled. Partial data may be available."
        lowContrast
        hideCloseButton={false}
      />
    );
  }

  // Collecting state
  const steps = getVpcSteps(vpcProgress.phase, vpcCollectionStatus, vpcErrors.length > 0);

  const percentage = vpcProgress.totalResources > 0
    ? Math.round((vpcProgress.completedResources / vpcProgress.totalResources) * 100)
    : 0;

  const statusText = vpcProgress.resource
    ? `${vpcProgress.resource}: ${vpcProgress.status || 'collecting'}`
    : vpcProgress.completedResources > 0
      ? `${vpcProgress.completedResources} of ${vpcProgress.totalResources} resources collected`
      : 'Initializing...';

  // ETA estimation
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
              {vpcStepTooltips[step.label] ? (
                <Tooltip label={vpcStepTooltips[step.label]} align="bottom">
                  <span style={{
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    color: step.status === 'pending' ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
                    fontWeight: step.status === 'in-progress' ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </Tooltip>
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  color: step.status === 'pending' ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
                  fontWeight: step.status === 'in-progress' ? 600 : 400,
                }}>
                  {step.label}
                </span>
              )}
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

      {/* Details below stepper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
            {vpcProgress.phase || 'Starting VPC collection...'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            {statusText}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--cds-text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            Elapsed: {formatElapsed(elapsedSeconds)}
          </span>
          {etaText && (
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--cds-text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {etaText}
            </span>
          )}
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={StopFilled}
            iconDescription="Cancel VPC collection"
            tooltipPosition="left"
            onClick={onCancel}
          />
        </div>
      </div>

      <ProgressBar
        value={percentage}
        label={`${percentage}% complete`}
        helperText={vpcProgress.phase ? `${vpcProgress.phase} — ${vpcProgress.completedResources} / ${vpcProgress.totalResources}` : 'Starting...'}
      />
    </div>
  );
};

export default VpcProgressIndicator;
