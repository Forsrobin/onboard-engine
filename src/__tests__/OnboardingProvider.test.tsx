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

  it('applies custom style configuration', () => {
    const customConfig: OnboardingConfig = {
      ...config,
      style: {
        background: { backgroundColor: 'rgba(255, 0, 0, 0.5)' },
        container: { border: '2px solid blue' },
        start: { color: 'red' },
        padding: 10,
      },
      steps: [
        { title: 'Step 1', description: 'Desc 1', attribute: 'step-1' },
        { title: 'Step 2', description: 'Desc 2', attribute: 'step-2' },
      ]
    };

    render(
      <OnboardingProvider config={customConfig}>
        <div data-onboarding-id="step-1">Step 1 Element</div>
      </OnboardingProvider>
    );

    // Verify mask elements exist and have style
    const masks = document.querySelectorAll('.onboard-overlay-mask');
    expect(masks.length).toBe(4);
    masks.forEach(mask => {
      expect(mask).toHaveStyle({ backgroundColor: 'rgba(255, 0, 0, 0.5)' });
    });

    // Verify container style
    const tooltip = document.querySelector('.onboard-tooltip') as HTMLElement;
    expect(tooltip.style.border).toBe('2px solid blue');

    // Verify start button style (since it's the first step)
    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });
});
