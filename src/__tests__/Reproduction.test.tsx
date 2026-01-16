import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { OnboardingProvider } from '../components/OnboardingProvider';
import { OnboardingConfig } from '../types';
import Cookies from 'js-cookie';

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('Onboarding Issue Reproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Cookies.get).mockReturnValue(undefined as any);
  });

  it('should not hide onboarding when moving between sub-steps even if URL does not match temporarily', async () => {
    vi.useFakeTimers();
    const config: OnboardingConfig = {
      metadata: { name: 'Reproduction', inOrder: true },
      steps: [
        {
          title: 'User Profile',
          description: 'Manage your user profile here.',
          attribute: 'user-profile-trigger',
          urlMatch: '/user',
          urlBase: '/user',
          subSteps: [
            {
              title: 'Setup Your Profile',
              description: 'Click this button to open the setup modal.',
              click: true,
              attribute: 'user-profile-trigger',
            },
            {
              title: 'Profile Modal',
              description: 'Fill in your details in this modal to complete your profile.',
              attribute: 'profile-modal',
            },
          ],
        },
      ],
    };

    vi.stubGlobal('location', {
      pathname: '/user',
      href: 'http://localhost/user',
    });

    const { rerender } = render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="user-profile-trigger">Trigger</button>
        <div data-onboarding-id="profile-modal">Modal</div>
      </OnboardingProvider>,
    );

    // Should show "User Profile" initially (main step)
    expect(screen.getByText('User Profile')).toBeInTheDocument();

    // Click next -> SubStep 0: Setup Your Profile
    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    expect(screen.getByText('Setup Your Profile')).toBeInTheDocument();

    // Click next -> SubStep 1: Profile Modal
    const nextBtn2 = screen.getByText('Next');
    await act(async () => {
      nextBtn2.click();
    });

    expect(screen.getByText('Profile Modal')).toBeInTheDocument();

    // SIMULATE ISSUE: Change URL to something that doesn't match /user
    vi.stubGlobal('location', {
      pathname: '/somewhere-else',
      href: 'http://localhost/somewhere-else',
    });

    // Trigger path change reconciliation
    await act(async () => {
        vi.advanceTimersByTime(200);
    });

    // rerender to propagate the stubbed location
    rerender(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="user-profile-trigger">Trigger</button>
        <div data-onboarding-id="profile-modal">Modal</div>
      </OnboardingProvider>
    );

    // NOW IT SHOULD STILL BE THERE because it's a sub-step
    expect(screen.getByText('Profile Modal')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should click parent step attribute when refreshing on SubStep 0', async () => {
    vi.useFakeTimers();
    const clickHandler = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Refresh Test', inOrder: true, simulateClicksOnNavigate: true },
      steps: [
        {
          title: 'Step 1',
          description: 'D',
          attribute: 'trigger',
          click: true,
          urlMatch: '/page',
          urlBase: '/page',
          subSteps: [
            { title: 'Sub 1', description: 'SD', attribute: 'sub-target' }
          ]
        },
      ],
    };

    // Mock cookie to be at SubStep 0
    vi.mocked(Cookies.get).mockReturnValue(
      JSON.stringify({
        currentStepIndex: 0,
        currentSubStepIndex: 0,
        isActive: true,
        completedSteps: [],
      }) as any
    );

    vi.stubGlobal('location', {
      pathname: '/page',
      href: 'http://localhost/page',
    });

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="trigger" onClick={clickHandler}>
          Trigger
        </button>
        <div data-onboarding-id="sub-target">Sub Target</div>
      </OnboardingProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // It SHOULD have clicked the parent 'trigger' to open the modal for Sub 1
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should NOT simulate clicks when moving through steps on the same page if simulateClicksOnNavigate is true', async () => {
    vi.useFakeTimers();
    const clickHandler = vi.fn();
    const config: OnboardingConfig = {
      metadata: { name: 'Double Click Test', inOrder: true, simulateClicksOnNavigate: true },
      steps: [
        {
          title: 'Step 1',
          description: 'Click to open',
          attribute: 'trigger',
          click: true,
          urlMatch: '/page',
          urlBase: '/page',
        },
        {
          title: 'Step 2',
          description: 'Next one',
          attribute: 'target',
          urlMatch: '/page',
          urlBase: '/page',
        },
      ],
    };

    vi.stubGlobal('location', {
      pathname: '/page',
      href: 'http://localhost/page',
    });

    render(
      <OnboardingProvider config={config}>
        <button data-onboarding-id="trigger" onClick={clickHandler}>
          Trigger
        </button>
        <div data-onboarding-id="target">Target</div>
      </OnboardingProvider>,
    );

    // Initial simulation (mount) should NOT happen because we are at Step 0 and nothing is before it.
    // Wait, simulateClicks(0, null) will be called.
    // collectStepClicks(Step 0, null) -> does nothing because upToSubStep is null.
    // So clickHandler should NOT be called yet.
    expect(clickHandler).not.toHaveBeenCalled();

    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });

    // nextStep() should have called clickHandler ONCE.
    expect(clickHandler).toHaveBeenCalledTimes(1);

    // After state change to Step 1, simulateClicks(1, null) might be called.
    // It would collect Step 0 click.
    // We want to ensure it DOES NOT call it again.
    await act(async () => {
      vi.advanceTimersByTime(1000); // Wait for potential simulated clicks
    });

    // IF IT CALLS IT AGAIN, THIS WILL FAIL
    expect(clickHandler).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should persist sub-step progress when switching between different steps', async () => {
    vi.useFakeTimers();
    const config: OnboardingConfig = {
      metadata: { name: 'Persistence Test', inOrder: false },
      steps: [
        {
          title: 'Step 1',
          description: 'D1',
          attribute: 's1',
          urlMatch: '/page1',
          urlBase: '/page1',
        },
        {
          title: 'Step 2',
          description: 'D2',
          attribute: 's2',
          urlMatch: '/page2',
          urlBase: '/page2',
          subSteps: [
            { title: 'Sub 2.1', description: 'SD2.1', attribute: 'ss21' },
            { title: 'Sub 2.2', description: 'SD2.2', attribute: 'ss22' },
          ],
        },
      ],
    };

    // 1. Start on Page 2
    vi.stubGlobal('location', { pathname: '/page2', href: 'http://localhost/page2' });
    const { rerender } = render(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <div data-onboarding-id="ss21">SS21</div>
        <div data-onboarding-id="ss22">SS22</div>
      </OnboardingProvider>
    );

    expect(screen.getByText('Step 2')).toBeInTheDocument();

    // 2. Move to Sub 2.1
    const nextBtn = screen.getByText('Next');
    await act(async () => {
      nextBtn.click();
    });
    expect(screen.getByText('Sub 2.1')).toBeInTheDocument();

    // 3. Navigate to Page 1
    vi.stubGlobal('location', { pathname: '/page1', href: 'http://localhost/page1' });
    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <div data-onboarding-id="ss21">SS21</div>
        <div data-onboarding-id="ss22">SS22</div>
      </OnboardingProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Step 1')).toBeInTheDocument();

    // 4. Navigate back to Page 2
    vi.stubGlobal('location', { pathname: '/page2', href: 'http://localhost/page2' });
    rerender(
      <OnboardingProvider config={config}>
        <div data-onboarding-id="s1">S1</div>
        <div data-onboarding-id="s2">S2</div>
        <div data-onboarding-id="ss21">SS21</div>
        <div data-onboarding-id="ss22">SS22</div>
      </OnboardingProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // SHOULD RESTORE Sub 2.1
    expect(screen.getByText('Sub 2.1')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
