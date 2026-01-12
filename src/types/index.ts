import type React from 'react';

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
}

export interface OnboardingState {
  currentStepIndex: number;
  currentSubStepIndex: number | null;
  isActive: boolean;
}
