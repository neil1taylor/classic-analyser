// Guided tour modal slideshow for first-time user onboarding
import { Modal, Link } from '@carbon/react';
import {
  Login,
  Dashboard,
  DataTable,
  Report,
  DataCollection,
} from '@carbon/icons-react';
import type { UseTourReturn } from '@/hooks/useTour';
import './GuidedTour.scss';

interface TourStepContent {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  brief: string;
  detailed: string;
}

const TOUR_STEPS: TourStepContent[] = [
  {
    icon: Login,
    label: 'Login',
    brief: 'Enter your IBM Cloud API key to connect to your infrastructure.',
    detailed: 'Supports both Classic Infrastructure and VPC. Your API key is never stored on disk — it stays in browser memory only.',
  },
  {
    icon: DataCollection,
    label: 'Collect',
    brief: 'Real-time SSE streaming collects data across Classic, VPC, and PowerVS resources.',
    detailed: 'Collection runs with 10 concurrent API calls per phase. Classic uses shallow scan + deep scan. VPC discovers all regions automatically.',
  },
  {
    icon: Dashboard,
    label: 'Explore',
    brief: 'Interactive dashboards show resource counts, costs, topology, and geographic distribution.',
    detailed: 'Each domain (Classic, VPC, PowerVS) has its own dashboard, topology view, cost analysis, and geography map.',
  },
  {
    icon: DataTable,
    label: 'Analyze',
    brief: 'Filterable, sortable tables with column customization for every resource type.',
    detailed: 'Supports advanced filtering, column resizing, and virtualization for large datasets. Resource relationships are mapped automatically.',
  },
  {
    icon: Report,
    label: 'Export',
    brief: 'Generate XLSX, PDF, Word, and PowerPoint reports for stakeholder review.',
    detailed: 'XLSX exports include one worksheet per resource type. PDF and Word reports include charts and AI-enhanced insights when configured.',
  },
];

interface GuidedTourProps {
  tour: UseTourReturn;
}

export function GuidedTour({ tour }: GuidedTourProps) {
  const { state, closeTour, nextStep, prevStep, goToStep, toggleMode, isFirstStep, isLastStep, totalSteps } = tour;
  const step = TOUR_STEPS[state.currentStep];

  if (!step) return null;

  const Icon = step.icon;

  return (
    <Modal
      open={state.isOpen}
      onRequestClose={closeTour}
      modalHeading="Getting Started"
      modalLabel={`Step ${state.currentStep + 1} of ${totalSteps}`}
      primaryButtonText={isLastStep ? 'Get Started' : 'Next'}
      secondaryButtonText={isFirstStep ? 'Skip' : 'Back'}
      onRequestSubmit={nextStep}
      onSecondarySubmit={isFirstStep ? closeTour : prevStep}
      size="sm"
      className="guided-tour"
    >
      <div className="guided-tour__body">
        <div className="guided-tour__icon-circle">
          <Icon size={32} />
        </div>
        <h3 className="guided-tour__step-label">{step.label}</h3>
        <p className="guided-tour__description">{step.brief}</p>

        {state.isDetailed && (
          <p className="guided-tour__detail">{step.detailed}</p>
        )}

        <Link
          className="guided-tour__toggle"
          onClick={toggleMode}
          role="button"
        >
          {state.isDetailed ? 'Show less' : 'Learn more'}
        </Link>

        <div className="guided-tour__dots">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`guided-tour__dot ${i === state.currentStep ? 'guided-tour__dot--active' : ''}`}
              onClick={() => goToStep(i)}
              aria-label={`Go to step ${i + 1}: ${TOUR_STEPS[i].label}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
