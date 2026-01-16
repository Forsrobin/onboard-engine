import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { OnboardingProvider, useOnboarding } from '../components/OnboardingProvider';
import { OnboardingConfig, OnboardingState } from '../types';
import Cookies from 'js-cookie';

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

const GoToStepTrigger = ({ step, subStep }: { step: number; subStep?: number | null }) => {
  const { goToStep } = useOnboarding();
  useEffect(() => {
    goToStep(step, subStep);
  }, [goToStep, step, subStep]);
  return null;
};

const StateInspector = ({ onState }: { onState: (state: OnboardingState) => void }) => {
  const { state } = useOnboarding();
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
};

describe('Onboarding Engine - Comprehensive Tests', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('location', {
      ...originalLocation,
      href: 'http://localhost/',
      pathname: '/',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('handles a complete flow with sub-steps, clicks, and page navigations', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Full Flow Test', inOrder: true },
      steps: [
        {
          title: 'Step 1',
          description: 'Initial Page',
          attribute: 'step-1',
          urlMatch: '/',
          navigate: '/dashboard',
        },
        {
          title: 'Step 2',
          description: 'Dashboard Main',
          attribute: 'step-2',
          urlMatch: '/dashboard',
          click: true,
          subSteps: [
            {
              title: 'SubStep 2.1',
              description: 'Inside Modal',
              attribute: 'ss-2-1',
            },
          ],
        },
      ],
      onOnboardingComplete: onComplete,
    };

    const modalToggle = vi.fn();

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-1">Step 1 Element</div>
        <button data-onboarding-id="step-2" onClick={modalToggle}>
          Open Modal
        </button>
        <div data-onboarding-id="ss-2-1">SubStep 2.1 Content</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Step 1');

    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ currentStepIndex: 1 }));

    vi.stubGlobal('location', {
      ...originalLocation,
      pathname: '/dashboard',
      href: 'http://localhost/dashboard',
    });

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
        completedSteps: [0],
      }) as unknown as { [key: string]: string },
    );

    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-1">Step 1 Element</div>
        <button data-onboarding-id="step-2" onClick={modalToggle}>
          Open Modal
        </button>
        <div data-onboarding-id="ss-2-1">SubStep 2.1 Content</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Step 2')).toBeInTheDocument();

    const nextBtn2 = screen.getByText('Next');
    await act(async () => {
      nextBtn2.click();
    });

    expect(modalToggle).toHaveBeenCalled();
    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('SubStep 2.1');

    const finishBtn = screen.getByText('Finish');
    await act(async () => {
      finishBtn.click();
    });

    expect(onComplete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('applies custom styling for all button types and elements', async () => {
    const config: OnboardingConfig = {
      metadata: { name: 'Style Test' },
      style: {
        background: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
        container: { borderRadius: '20px' },
        start: { backgroundColor: 'rgb(0, 128, 0)' },
        next: { backgroundColor: 'rgb(0, 0, 255)' },
        prev: { backgroundColor: 'rgb(255, 0, 0)' },
        finish: { backgroundColor: 'rgb(255, 215, 0)' },
      },
      steps: [
        { title: 'S1', description: 'D1', attribute: 'a1', urlMatch: '/' },
        { title: 'S2', description: 'D2', attribute: 'a2', urlMatch: '/' },
        { title: 'S3', description: 'D3', attribute: 'a3', urlMatch: '/' },
      ],
    };

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="a1">A1</div>
        <div data-onboarding-id="a2">A2</div>
        <div data-onboarding-id="a3">A3</div>
      </OnboardingProvider>,
    );

    const startBtn = screen.getByText('Start').closest('button');
    expect(startBtn).toHaveStyle({ backgroundColor: 'rgb(0, 128, 0)' });

    await act(async () => {
      startBtn?.click();
    });

    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="a1">A1</div>
        <div data-onboarding-id="a2">A2</div>
        <div data-onboarding-id="a3">A3</div>
      </OnboardingProvider>,
    );

    const prevBtn = screen.getByText('Prev').closest('button');
    const nextBtn = screen.getByText('Next').closest('button');
    expect(prevBtn).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
    expect(nextBtn).toHaveStyle({ backgroundColor: 'rgb(0, 0, 255)' });

    await act(async () => {
      nextBtn?.click();
    });

    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="a1">A1</div>
        <div data-onboarding-id="a2">A2</div>
        <div data-onboarding-id="a3">A3</div>
      </OnboardingProvider>,
    );

    const finishBtn = screen.getByText('Finish').closest('button');
    expect(finishBtn).toHaveStyle({ backgroundColor: 'rgb(255, 215, 0)' });
    expect(document.querySelector('.onboard-tooltip')).toHaveStyle({ borderRadius: '20px' });
  });

  it('correctly uses goToStep to jump between steps and substeps', async () => {
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'GoToStep Test' },
      steps: [
        { title: 'S1', description: 'D1', attribute: 'a1', urlMatch: '/' },
        {
          title: 'S2',
          description: 'D2',
          attribute: 'a2',
          urlMatch: '/',
          subSteps: [
            { title: 'SS2.1', description: 'D2.1', attribute: 'ss21' },
            { title: 'SS2.2', description: 'D2.2', attribute: 'ss22' },
          ],
        },
      ],
    };

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="a1">A1</div>
        <div data-onboarding-id="a2">A2</div>
        <div data-onboarding-id="ss21">SS21</div>
        <div data-onboarding-id="ss22">SS22</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('S1');

    await act(async () => {
      rerender(
        <OnboardingProvider config={config}>
          <div data-onboarding-id="a1">A1</div>
          <div data-onboarding-id="a2">A2</div>
          <div data-onboarding-id="ss21">SS21</div>
          <div data-onboarding-id="ss22">SS22</div>
          <GoToStepTrigger step={1} subStep={1} />
          <StateInspector onState={onStateChange} />
        </OnboardingProvider>,
      );
    });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStepIndex: 1,
        currentSubStepIndex: 1,
      }),
    );
  });
});
