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
    vi.useFakeTimers();
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
          urlBase: '/',
          navigate: '/home',
        },
        {
          title: 'Step 2',
          description: 'Dashboard',
          attribute: 'step-2',
          urlMatch: '/home',
          urlBase: '/home',
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
        completedSteps: [0],
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-2">Step 2 Content</div>
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(window.location.href).toBe('/home');
    vi.useRealTimers();
  });

  it('navigates to current step urlMatch if previous step has no navigate prop', () => {
    vi.useFakeTimers();
    const config: OnboardingConfig = {
      metadata: { name: 'Nav Test 2', inOrder: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D',
          attribute: 's1',
          urlMatch: '/',
          urlBase: '/',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/dashboard',
          urlBase: '/dashboard',
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
        completedSteps: [0],
      }) as unknown as { [key: string]: string },
    );

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s2">S2</div>
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(window.location.href).toBe('/dashboard');
    vi.useRealTimers();
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
          urlBase: '/',
        },
        {
          title: 'Step 2',
          description: 'Parent Step',
          attribute: 'parent-step',
          click: true,
          urlMatch: '/',
          urlBase: '/',
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
        completedSteps: [0],
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
      vi.advanceTimersByTime(200); // Advance for path interval
      vi.advanceTimersByTime(500); // Advance for click timeout
    });

    expect(handleClick).toHaveBeenCalled();
    vi.useRealTimers();
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
          urlBase: '/',
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

  it('navigates to the next step URL when clicking Next if navigate is present on the next step', async () => {
    const config: OnboardingConfig = {
      metadata: { name: 'Next Nav Test', inOrder: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 's1',
          urlMatch: '/',
          urlBase: '/',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/next-page',
          urlBase: '/next-page',
          navigate: '/next-page',
        },
      ],
    };

    const { getByText } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
      </OnboardingProvider>,
    );

    const nextBtn = getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    expect(window.location.href).toBe('/next-page');
  });
});
