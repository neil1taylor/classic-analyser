import React from 'react';
import {
  Tile,
  SkeletonText,
  Tag,
  UnorderedList,
  ListItem,
} from '@carbon/react';
import { useAI } from '@/contexts/AIContext';

const severityKindMap: Record<string, 'red' | 'magenta' | 'warm-gray' | 'cyan'> = {
  critical: 'red',
  high: 'magenta',
  medium: 'warm-gray',
  low: 'cyan',
};

/**
 * AIInsights — displays AI-generated infrastructure insights.
 * Renders nothing when AI is unavailable (graceful degradation).
 */
const AIInsights: React.FC = () => {
  const { insights, insightsLoading, insightsError, isAvailable, isConfigured } = useAI();

  // Graceful degradation: render nothing when AI is not available
  if (!isConfigured || !isAvailable) {
    return null;
  }

  if (insightsLoading) {
    return (
      <div className="ai-insights">
        <Tile className="ai-insights__tile">
          <h5 className="ai-insights__heading">AI Insights</h5>
          <SkeletonText paragraph lineCount={4} />
        </Tile>
      </div>
    );
  }

  if (insightsError) {
    // Silently degrade — do not show errors for optional AI features
    return null;
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="ai-insights">
      {/* Executive Summary */}
      {insights.executiveSummary && (
        <Tile className="ai-insights__tile">
          <h5 className="ai-insights__heading">AI Executive Summary</h5>
          <p className="ai-insights__summary">{insights.executiveSummary}</p>
        </Tile>
      )}

      {/* Risks */}
      {insights.risks && insights.risks.length > 0 && (
        <Tile className="ai-insights__tile">
          <h5 className="ai-insights__heading">Identified Risks</h5>
          <div className="ai-insights__risks">
            {insights.risks.map((risk, index) => (
              <div key={index} className="ai-insights__risk-item">
                <div className="ai-insights__risk-header">
                  <Tag
                    type={severityKindMap[risk.severity] || 'warm-gray'}
                    size="sm"
                  >
                    {risk.severity}
                  </Tag>
                  <span className="ai-insights__risk-title">{risk.title}</span>
                </div>
                <p className="ai-insights__risk-description">{risk.description}</p>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <Tile className="ai-insights__tile">
          <h5 className="ai-insights__heading">Recommendations</h5>
          <UnorderedList>
            {insights.recommendations.map((rec, index) => (
              <ListItem key={index}>{rec}</ListItem>
            ))}
          </UnorderedList>
        </Tile>
      )}
    </div>
  );
};

export default AIInsights;
