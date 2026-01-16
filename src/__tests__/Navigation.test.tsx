import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { OnboardingProvider } from '../components/OnboardingProvider';
import { OnboardingConfig } from '../types';
import Cookies from 'js-cookie';

vi.mock('js-cookie', () => {
  return {
    default: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  };
});

describe('OnboardingProvider Navigation & Restoration', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubGlobal('location', {
      ...originalLocation,
      href: 'http://localhost/',
      pathname: '/',
      assign: vi.fn(),
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("navigates to the previous step's navigate prop when resuming at index > 0", () => {
    const config: OnboardingConfig = {
      metadata: {
        name: 'Navigation Test',
        inOrder: true,
      },
      steps: [
        {
          title: 'Step 1',
          description: 'Welcome',
          attribute: 'step-1',
          urlMatch: '/',
          navigate: '/home',
        },
        {
          title: 'Step 2',
          description: 'Dashboard',
          attribute: 'step-2',
          urlMatch: '/home',
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-2">Step 2 Content</div>
      </OnboardingProvider>,
    );

    expect(window.location.href).toBe('/home');
  });

  it('navigates to current step urlMatch if previous step has no navigate prop', () => {
    const config: OnboardingConfig = {
      metadata: { name: 'Nav Test 2', inOrder: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D',
          attribute: 's1',
          urlMatch: '/',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/dashboard',
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s2">S2</div>
      </OnboardingProvider>,
    );

    expect(window.location.href).toBe('/dashboard');
  });

  it('simulates click on parent step attribute when resuming in a sub-step with simulateClicksOnNavigate: true', async () => {
    vi.useFakeTimers();

    const handleClick = vi.fn();
    const config: OnboardingConfig = {
      metadata: {
        name: 'Click Test',
        simulateClicksOnNavigate: true,
      },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 'step-1',
          urlMatch: '/',
        },
        {
          title: 'Step 2',
          description: 'Parent Step',
          attribute: 'parent-step',
          click: true,
          urlMatch: '/',
          subSteps: [
            {
              title: 'SubStep 1',
              description: 'SS1',
              attribute: 'ss1',
            },
          ],
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: 0,
        isActive: true,
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="parent-step" onClick={handleClick}>
          Open Modal
        </button>
        <div data-onboarding-id="ss1">SubStep Content</div>
      </OnboardingProvider>,
    );

    expect(handleClick).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(handleClick).toHaveBeenCalled();
  });

  it('does NOT simulate click if simulateClicksOnNavigate is false (default)', async () => {
    vi.useFakeTimers();

    const handleClick = vi.fn();
    const config: OnboardingConfig = {
      metadata: {
        name: 'Click Test False',
      },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 's1',
          urlMatch: '/',
          click: true,
          subSteps: [{ title: 'SS1', description: 'SS1', attribute: 'ss1' }],
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: 0,
        isActive: true,
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="s1" onClick={handleClick}>
          Button
        </button>
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(handleClick).not.toHaveBeenCalled();
  });
});
