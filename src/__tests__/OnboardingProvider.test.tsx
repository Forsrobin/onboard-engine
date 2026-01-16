import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OnboardingProvider } from '../components/OnboardingProvider';
import { OnboardingConfig } from '../types';
import Cookies from 'js-cookie';

const config: OnboardingConfig = {
  metadata: {
    name: 'Test Onboarding',
  },
  steps: [
    {
      title: 'Step 1',
      description: 'Desc 1',
      attribute: 'step-1',
      urlMatch: '/',
    },
  ],
};

describe('OnboardingProvider', () => {
  beforeEach(() => {
    Cookies.remove('onboarding_state');
  });

  it('renders children correctly', () => {
    render(
      <OnboardingProvider config={config}>
        <div data-testid="child">Child Content</div>
      </OnboardingProvider>,
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
        { title: 'Step 1', description: 'Desc 1', attribute: 'step-1', urlMatch: '/' },
        { title: 'Step 2', description: 'Desc 2', attribute: 'step-2', urlMatch: '/step-2' },
      ],
    };

    render(
      <OnboardingProvider config={customConfig}>
        <div data-onboarding-id="step-1">Step 1 Element</div>
      </OnboardingProvider>,
    );

    const masks = document.querySelectorAll('.onboard-overlay-mask');
    expect(masks.length).toBe(4);
    masks.forEach((mask) => {
      expect(mask).toHaveStyle({ backgroundColor: 'rgba(255, 0, 0, 0.5)' });
    });

    const tooltip = document.querySelector('.onboard-tooltip') as HTMLElement;
    expect(tooltip.style.border).toBe('2px solid blue');

    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('clicks the element when moving to the next step if click property is true', () => {
    const handleClick = vi.fn();
    const clickConfig: OnboardingConfig = {
      ...config,
      steps: [
        {
          title: 'Click Step',
          description: 'This step clicks',
          attribute: 'click-me',
          click: true,
          urlMatch: '/',
        },
        {
          title: 'Next Step',
          description: 'Next step',
          attribute: 'next-step',
          urlMatch: '/next',
        },
      ],
    };

    render(
      <OnboardingProvider config={clickConfig}>
        <button data-onboarding-id="click-me" onClick={handleClick}>
          Click Me
        </button>
      </OnboardingProvider>,
    );

    expect(handleClick).not.toHaveBeenCalled();

    const nextBtn = screen.getByText('Next');
    nextBtn.click();

    expect(handleClick).toHaveBeenCalled();
  });

  it('hides onboarding when inOrder is false and URL matches no step', () => {
    vi.stubGlobal('location', {
      pathname: '/no-match-page',
    });

    const noMatchConfig: OnboardingConfig = {
      metadata: { name: 'No Match Test', inOrder: false },
      steps: [
        {
          title: 'Step 1',
          description: 'Desc 1',
          attribute: 'step-1',
          urlMatch: '/step-1',
        },
      ],
    };

    render(
      <OnboardingProvider config={noMatchConfig}>
        <div data-onboarding-id="step-1">Step 1 Element</div>
      </OnboardingProvider>,
    );

    const overlay = document.querySelector('.onboard-tooltip');
    expect(overlay).toBeNull();
  });

  it('activates the matching step based on wildcard string when inOrder is false', async () => {
    vi.stubGlobal('location', {
      pathname: '/user/123',
    });

    const wildcardConfig: OnboardingConfig = {
      metadata: { name: 'Wildcard Test', inOrder: false },
      steps: [
        {
          title: 'User Profile',
          description: 'User details',
          attribute: 'user-profile',
          urlMatch: '/user/*',
        },
      ],
    };

    render(
      <OnboardingProvider config={wildcardConfig}>
        <div data-onboarding-id="user-profile">User Profile Element</div>
      </OnboardingProvider>,
    );

    expect(await screen.findByText('User Profile')).toBeInTheDocument();
  });
});
