import type React from 'react';

export interface OnboardingSubStep {
  title: string;
  description: string;
  attribute: string;
  navigate?: string;
  click?: boolean;
}

export interface OnboardingStep {
  title: string;
  description: string;
  attribute: string;
  urlMatch: string;
  navigate?: string;
  subSteps?: OnboardingSubStep[];
  click?: boolean;
}

export interface OnboardingMetadata {
  name: string;
  nextRouter?: boolean;
  draggable?: boolean;
  inOrder?: boolean;
  simulateClicksOnNavigate?: boolean;
}

export interface OnboardingStyle {
  padding?: number;
  background?: React.CSSProperties;
  container?: React.CSSProperties;
  next?: React.CSSProperties;
  prev?: React.CSSProperties;
  start?: React.CSSProperties;
  finish?: React.CSSProperties;
}

export interface OnboardingConfig {
  metadata: OnboardingMetadata;
  steps: OnboardingStep[];
  style?: OnboardingStyle;
  onOnboardingComplete?: () => void;
}

export interface OnboardingState {
  currentStepIndex: number;
  currentSubStepIndex: number | null;
  isActive: boolean;
  completedSteps: number[];
  subStepProgress: Record<number, number | null>;
}
