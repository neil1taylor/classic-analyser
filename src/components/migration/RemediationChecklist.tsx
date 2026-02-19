import React, { useState } from 'react';
import {
  Accordion,
  AccordionItem,
  Tag,
  Link,
  UnorderedList,
  ListItem,
  Button,
} from '@carbon/react';
import {
  ErrorFilled,
  WarningAltFilled,
  InformationFilled,
  CheckmarkFilled,
  UnknownFilled,
} from '@carbon/icons-react';
import type { CheckResult, CheckSeverity } from '@/types/migration';

interface Props {
  checks: CheckResult[];
  title?: string;
}

const SEVERITY_ORDER: Record<CheckSeverity, number> = {
  blocker: 0,
  warning: 1,
  info: 2,
  unknown: 3,
  passed: 4,
};

function severityIcon(severity: CheckSeverity): React.ReactNode {
  switch (severity) {
    case 'blocker':
      return <ErrorFilled size={16} className="remediation-icon remediation-icon--blocker" />;
    case 'warning':
      return <WarningAltFilled size={16} className="remediation-icon remediation-icon--warning" />;
    case 'info':
      return <InformationFilled size={16} className="remediation-icon remediation-icon--info" />;
    case 'unknown':
      return <UnknownFilled size={16} className="remediation-icon remediation-icon--unknown" />;
    case 'passed':
      return <CheckmarkFilled size={16} className="remediation-icon remediation-icon--passed" />;
  }
}

function severityTag(severity: CheckSeverity): React.ReactNode {
  switch (severity) {
    case 'blocker':
      return <Tag type="red" size="sm">Blocker</Tag>;
    case 'warning':
      return <Tag type="warm-gray" size="sm">Warning</Tag>;
    case 'info':
      return <Tag type="blue" size="sm">Info</Tag>;
    case 'unknown':
      return <Tag type="purple" size="sm">Unknown</Tag>;
    case 'passed':
      return <Tag type="green" size="sm">Passed</Tag>;
  }
}

const MAX_VISIBLE_RESOURCES = 5;

const ResourceList: React.FC<{ check: CheckResult }> = ({ check }) => {
  const [expanded, setExpanded] = useState(false);
  const resources = check.affectedResources;
  if (resources.length === 0) return null;

  const visible = expanded ? resources : resources.slice(0, MAX_VISIBLE_RESOURCES);
  const remaining = resources.length - MAX_VISIBLE_RESOURCES;

  return (
    <div className="remediation-resources">
      <div className="remediation-resources__label">
        Affected resources ({check.affectedCount} of {check.totalChecked}):
      </div>
      <UnorderedList nested>
        {visible.map((r, i) => (
          <ListItem key={`${r.id}-${i}`}>
            <span className="remediation-resources__hostname">{r.hostname}</span>
            {r.detail && <span className="remediation-resources__detail"> — {r.detail}</span>}
          </ListItem>
        ))}
      </UnorderedList>
      {!expanded && remaining > 0 && (
        <Button
          kind="ghost"
          size="sm"
          className="remediation-resources__more"
          onClick={() => setExpanded(true)}
        >
          ... and {remaining} more
        </Button>
      )}
      {expanded && remaining > 0 && (
        <Button
          kind="ghost"
          size="sm"
          className="remediation-resources__more"
          onClick={() => setExpanded(false)}
        >
          Show less
        </Button>
      )}
    </div>
  );
};

const RemediationChecklist: React.FC<Props> = ({ checks, title }) => {
  const sorted = [...checks].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const blockerCount = checks.filter((c) => c.severity === 'blocker').length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const unknownCount = checks.filter((c) => c.severity === 'unknown').length;
  const passedCount = checks.filter((c) => c.severity === 'passed').length;
  const allPassed = blockerCount === 0 && warningCount === 0;

  return (
    <div className="remediation-checklist">
      {title && (
        <h5 className="remediation-checklist__title">{title}</h5>
      )}

      {/* Summary badges */}
      <div className="remediation-checklist__summary">
        {blockerCount > 0 && (
          <Tag type="red" size="sm">{blockerCount} Blocker{blockerCount !== 1 ? 's' : ''}</Tag>
        )}
        {warningCount > 0 && (
          <Tag type="warm-gray" size="sm">{warningCount} Warning{warningCount !== 1 ? 's' : ''}</Tag>
        )}
        {unknownCount > 0 && (
          <Tag type="purple" size="sm">{unknownCount} Unknown</Tag>
        )}
        {allPassed && passedCount > 0 && (
          <Tag type="green" size="sm">All checks passed</Tag>
        )}
        {checks.length === 0 && (
          <Tag type="outline" size="sm">No checks available</Tag>
        )}
      </div>

      {/* Accordion rows */}
      {sorted.length > 0 && (
        <Accordion>
          {sorted.map((result) => (
            <AccordionItem
              key={result.check.id}
              title={
                <span className="remediation-checklist__row-title">
                  {severityIcon(result.severity)}
                  <span className="remediation-checklist__check-name">{result.check.name}</span>
                  {severityTag(result.severity)}
                  {result.affectedCount > 0 && (
                    <Tag type="outline" size="sm">{result.affectedCount} affected</Tag>
                  )}
                </span>
              }
            >
              <div className="remediation-checklist__detail">
                <p className="remediation-checklist__description">
                  {result.check.description}
                </p>

                {result.check.threshold && (
                  <p className="remediation-checklist__threshold">
                    Threshold: {result.check.threshold}
                  </p>
                )}

                {result.check.remediationSteps.length > 0 && (
                  <div className="remediation-checklist__steps">
                    <div className="remediation-checklist__steps-label">Remediation steps:</div>
                    <ol className="remediation-checklist__steps-list">
                      {result.check.remediationSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="remediation-checklist__docs">
                  <Link href={result.check.docsUrl} target="_blank" rel="noopener noreferrer" size="sm">
                    View Documentation
                  </Link>
                </div>

                <ResourceList check={result} />
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default RemediationChecklist;
