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

const StateInspector = ({
  onState,
  currentPath,
}: {
  onState: (state: OnboardingState) => void;
  currentPath?: string;
}) => {
  const { state } = useOnboarding();
  useEffect(() => {
    onState(state);
  }, [state, onState, currentPath]);
  return null;
};

describe('Onboarding Engine - InOrder: False Persistence', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('location', {
      ...originalLocation,
      href: 'http://localhost/page1',
      pathname: '/page1',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks a step as completed and does not show it again on refresh when inOrder is false', async () => {
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Persistence Test', inOrder: false },
      steps: [
        {
          title: 'Step 1',
          description: 'Description 1',
          attribute: 'step-1',
          urlMatch: '/page1',
        },
        {
          title: 'Step 2',
          description: 'Description 2',
          attribute: 'step-2',
          urlMatch: '/page2',
        },
      ],
    };

    // 1. Initial render on /page1
    const { unmount } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-1">Element 1</div>
        <div data-onboarding-id="step-2">Element 2</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    // Should show Step 1
    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Step 1');
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentStepIndex: 0,
        isActive: true,
      }),
    );

    // 2. Complete Step 1 (it's the only sub-step, so clicking Next/Finish should complete it)
    // Since it's NOT inOrder, and it's the first step, it might show "Next" or "Finish" depending on total steps.
    // In this case, it's index 0 of 2, so it shows "Next".
    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    // Verify completedSteps contains 0
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        completedSteps: [0],
      }),
    );

    // Verify Cookies.set was called with completedSteps: [0]
    const lastSetCall = vi.mocked(Cookies.set).mock.calls[
      vi.mocked(Cookies.set).mock.calls.length - 1
    ];
    const savedState = JSON.parse(lastSetCall[1]);
    expect(savedState.completedSteps).toContain(0);

    // 3. Simulate refresh on /page1
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify(savedState) as unknown as { [key: string]: string },
    );

    // Unmount and remount to simulate a real page refresh/load
    unmount();

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-1">Element 1</div>
        <div data-onboarding-id="step-2">Element 2</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    // Should NOT show Step 1 because it's completed
    expect(document.querySelector('.onboard-tooltip')).toBeNull();
  });

  it('navigates to the first unfinished step when inOrder is true', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'InOrder True Test', inOrder: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 's1',
          urlMatch: '/page1',
          navigate: '/page1',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/page2',
          navigate: '/page2',
        },
      ],
    };

    // Simulate Step 1 already completed in cookies
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: null,
        isActive: true,
        completedSteps: [0],
      }) as unknown as { [key: string]: string },
    );

    vi.stubGlobal('location', {
      pathname: '/page1',
      href: 'http://localhost/page1',
    });

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <StateInspector onState={onStateChange} currentPath="/page1" />
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // It should have navigated to /page2 because Step 1 is completed
    expect(window.location.href).toContain('/page2');

    // Simulate the navigation effect in test
    vi.stubGlobal('location', {
      pathname: '/page2',
      href: 'http://localhost/page2',
    });

    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <StateInspector onState={onStateChange} currentPath="/page2" />
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Step 2')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows onboarding when navigating to a matching page in a SPA-like way (inOrder: false)', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'SPA Test', inOrder: false },
      steps: [
        {
          title: 'Page 1 Step',
          description: 'D1',
          attribute: 's1',
          urlMatch: '/page1',
        },
        {
          title: 'Page 2 Step',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/page2',
        },
      ],
    };

    // Start on Page 1
    vi.stubGlobal('location', {
      pathname: '/page1',
      href: 'http://localhost/page1',
    });

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <StateInspector onState={onStateChange} currentPath="/page1" />
      </OnboardingProvider>,
    );

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Page 1 Step');

    // Simulate manual navigation to Page 2 (SPA)
    vi.stubGlobal('location', {
      pathname: '/page2',
      href: 'http://localhost/page2',
    });

    // We need the provider to react to path changes.
    // In a real app, a router change would trigger a re-render of the app.
    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <StateInspector onState={onStateChange} currentPath="/page2" />
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Page 2 Step')).toBeInTheDocument();
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentStepIndex: 1,
        isActive: true,
      }),
    );
    vi.useRealTimers();
  });

  it('replays sub-step clicks when resuming a step with sub-steps', async () => {
    vi.useFakeTimers();
    const config: OnboardingConfig = {
      metadata: { name: 'Replay Test', inOrder: true, simulateClicksOnNavigate: true },
      steps: [
        {
          title: 'Main Step',
          description: 'D',
          attribute: 'main-trigger',
          click: true,
          urlMatch: '/page',
          subSteps: [
            { title: 'Sub 1', description: 'SD1', attribute: 'sub-1-trigger', click: true },
            { title: 'Sub 2', description: 'SD2', attribute: 'sub-2-target' },
          ],
        },
      ],
    };

    const mainHandle = vi.fn();
    const sub1Handle = vi.fn();

    // Mock cookie to be at Sub 2
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: 1,
        isActive: true,
        completedSteps: [],
      }) as unknown as { [key: string]: string },
    );

    vi.stubGlobal('location', { pathname: '/page', href: 'http://localhost/page' });

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="main-trigger" onClick={mainHandle}>
          Main
        </button>
        <button data-onboarding-id="sub-1-trigger" onClick={sub1Handle}>
          Sub 1
        </button>
        <div data-onboarding-id="sub-2-target">Sub 2 Target</div>
      </OnboardingProvider>,
    );

    // Should NOT have clicked immediately
    expect(mainHandle).not.toHaveBeenCalled();
    expect(sub1Handle).not.toHaveBeenCalled();

    // Advance time to allow sequential clicks
    await act(async () => {
      vi.advanceTimersByTime(200); // Path interval
      vi.advanceTimersByTime(500); // First click (Main)
    });
    expect(mainHandle).toHaveBeenCalled();
    expect(sub1Handle).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500); // Second click (Sub 1)
    });
    expect(sub1Handle).toHaveBeenCalled();

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Sub 2');
    vi.useRealTimers();
  });

  it('replays clicks from completed previous steps on the same URL', async () => {
    vi.useFakeTimers();
    const config: OnboardingConfig = {
      metadata: { name: 'Multi-Step Replay', inOrder: true, simulateClicksOnNavigate: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 'trigger-1',
          click: true,
          urlMatch: '/page',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 'target-2',
          urlMatch: '/page',
        },
      ],
    };

    const handle1 = vi.fn();

    // Step 1 completed
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 1,
        currentSubStepIndex: null,
        isActive: true,
        completedSteps: [0],
      }) as unknown as { [key: string]: string },
    );

    vi.stubGlobal('location', { pathname: '/page', href: 'http://localhost/page' });

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="trigger-1" onClick={handle1}>
          Button 1
        </button>
        <div data-onboarding-id="target-2">Target 2</div>
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(200); // Path
      vi.advanceTimersByTime(500); // Step 1 click
    });

    expect(handle1).toHaveBeenCalled();
    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Step 2');
    vi.useRealTimers();
  });

  it('restores sub-step progress when navigating back to a page in inOrder: false mode', async () => {
    vi.useFakeTimers();
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Restore Test', inOrder: false, simulateClicksOnNavigate: true },
      steps: [
        {
          title: 'User Page',
          description: 'D',
          attribute: 'user-trigger',
          urlMatch: '/user',
          subSteps: [
            { title: 'Sub 1', description: 'SD1', attribute: 'sub-1', click: true },
            { title: 'Sub 2', description: 'SD2', attribute: 'sub-2' },
          ],
        },
      ],
    };

    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: 1,
        isActive: true,
        completedSteps: [],
      }) as unknown as { [key: string]: string },
    );
    vi.stubGlobal('location', { pathname: '/user', href: 'http://localhost/user' });

    const { rerender, unmount } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="user-trigger">User</div>
        <div data-onboarding-id="sub-1">Sub 1</div>
        <div data-onboarding-id="sub-2">Sub 2</div>
        <StateInspector onState={onStateChange} currentPath="/user" />
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Sub 2');

    // 2. Navigate to /dashboard (no match)
    vi.stubGlobal('location', { pathname: '/dashboard', href: 'http://localhost/dashboard' });

    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="user-trigger">User</div>
        <StateInspector onState={onStateChange} currentPath="/dashboard" />
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    await vi.waitFor(() => {
      expect(document.querySelector('.onboard-tooltip')).toBeNull();
    });

    // 2.5 Simulate refresh while on /dashboard
    unmount();
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: 1,
        isActive: true,
        completedSteps: [],
      }) as unknown as { [key: string]: string },
    );

    const { rerender: rerender2 } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="user-trigger">User</div>
        <StateInspector onState={onStateChange} currentPath="/dashboard" />
      </OnboardingProvider>,
    );

    // 3. Navigate back to /user
    vi.stubGlobal('location', { pathname: '/user', href: 'http://localhost/user' });

    rerender2(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="user-trigger">User</div>
        <div data-onboarding-id="sub-1">Sub 1</div>
        <div data-onboarding-id="sub-2">Sub 2</div>
        <StateInspector onState={onStateChange} currentPath="/user" />
      </OnboardingProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should still be at Sub 2
    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Sub 2');
    vi.useRealTimers();
  });

  it('only marks a step completed when all sub-steps are finished', async () => {
    const onStateChange = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Substep Persistence Test', inOrder: false },
      steps: [
        {
          title: 'Step 1',
          description: 'Description 1',
          attribute: 'step-1',
          urlMatch: '/page1',
          subSteps: [
            { title: 'Sub 1.1', description: 'D1.1', attribute: 'ss11' },
            { title: 'Sub 1.2', description: 'D1.2', attribute: 'ss12' },
          ],
        },
      ],
    };

    render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="step-1">E1</div>
        <div data-onboarding-id="ss11">SS11</div>
        <div data-onboarding-id="ss12">SS12</div>
        <StateInspector onState={onStateChange} />
      </OnboardingProvider>,
    );

    // First it shows the main step
    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Step 1');

    // Click next to go to Sub 1.1
    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Sub 1.1');

    // Click next to go to Sub 1.2
    const nextBtn2 = screen.getByText('Next');
    await act(async () => {
      nextBtn2.click();
    });

    expect(document.querySelector('.onboard-tooltip-title')?.textContent).toBe('Sub 1.2');
    // completedSteps should still be empty
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        completedSteps: [],
        currentSubStepIndex: 1,
      }),
    );

    // Click finish to complete the step
    const finishBtn = screen.getByText('Finish');
    await act(async () => {
      finishBtn.click();
    });

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        completedSteps: [0],
        isActive: false,
      }),
    );
  });
});
