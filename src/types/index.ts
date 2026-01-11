export interface OnboardingSubStep {
  title: string;
  description: string;
  attribute: string;
  link?: string;
  click?: boolean;
  navigateAutomatically?: boolean;
}

export interface OnboardingStep {
  title: string;
  description: string;
  attribute: string;
  link?: string;
  subSteps?: OnboardingSubStep[];
  click?: boolean;
  navigateAutomatically?: boolean;
}

export interface OnboardingMetadata {
  name: string;
  nextRouter?: boolean;
  draggable?: boolean;
}

export interface OnboardingConfig {
  metadata: OnboardingMetadata;
  steps: OnboardingStep[];
}

export interface OnboardingState {
  currentStepIndex: number;
  currentSubStepIndex: number | null;
  isActive: boolean;
}
