import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OnboardingProvider } from '../components/OnboardingProvider';
import { OnboardingConfig } from '../types';

const config: OnboardingConfig = {
  metadata: {
    name: 'Test Onboarding',
  },
  steps: [
    {
      title: 'Step 1',
      description: 'Desc 1',
      attribute: 'step-1',
    },
  ],
};

describe('OnboardingProvider', () => {
  it('renders children correctly', () => {
    render(
      <OnboardingProvider config={config}>
        <div data-testid="child">Child Content</div>
      </OnboardingProvider>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });
});
