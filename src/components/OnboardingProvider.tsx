'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import Cookies from 'js-cookie';
import { OnboardingConfig, OnboardingState, OnboardingStep, OnboardingSubStep } from '../types';
import { OnboardingOverlay } from './OnboardingOverlay';

interface OnboardingContextType {
  config: OnboardingConfig;
  state: OnboardingState;
  nextStep: () => void;
  prevStep: () => void;
  finish: () => void;
  goToStep: (stepIndex: number, subStepIndex?: number | null) => void;
  currentStep: OnboardingStep | OnboardingSubStep | null;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const COOKIE_NAME = 'onboarding_state';

const getInitialState = (): OnboardingState => {
  if (typeof window !== 'undefined') {
    const saved = Cookies.get(COOKIE_NAME);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            currentStepIndex: parsed.currentStepIndex ?? 0,
            currentSubStepIndex: parsed.currentSubStepIndex ?? null,
            isActive: parsed.isActive ?? true,
            completedSteps: parsed.completedSteps ?? [],
            subStepProgress: parsed.subStepProgress ?? {},
          };
        }
      } catch {
        // Ignore
      }
    }
  }
  return {
    currentStepIndex: 0,
    currentSubStepIndex: null,
    isActive: true,
    completedSteps: [],
    subStepProgress: {},
  };
};

export const OnboardingProvider: React.FC<{
  config: OnboardingConfig;
  ssr?: boolean;
  onNavigate?: (url: string) => void;
  children: React.ReactNode;
}> = ({ config, ssr = false, onNavigate, children }) => {
  const [isMounted, setIsMounted] = useState(!ssr);
  const [state, setState] = useState<OnboardingState>(getInitialState);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '',
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const configRef = useRef(config);
  const onNavigateRef = useRef(onNavigate);
  const lastSimulatedKey = useRef<string>('');
  const lastPathForSimulation = useRef<string>(
    typeof window !== 'undefined' ? window.location.pathname : '',
  );
  const wasInternalAction = useRef(false);

  useEffect(() => {
    if (currentPath !== lastPathForSimulation.current) {
      lastPathForSimulation.current = currentPath;
      lastSimulatedKey.current = ''; // Reset simulation tracking on path change
    }
  }, [currentPath]);

  useEffect(() => {
    configRef.current = config;
    onNavigateRef.current = onNavigate;
  }, [config, onNavigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePathChange = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);
    };

    window.addEventListener('popstate', handlePathChange);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handlePathChange();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handlePathChange();
    };

    window.addEventListener('locationchange', handlePathChange);
    const interval = setInterval(handlePathChange, 200);

    return () => {
      window.removeEventListener('popstate', handlePathChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('locationchange', handlePathChange);
      clearInterval(interval);
    };
  }, []);

  const handleNavigation = useCallback((link?: string) => {
    if (!link) return;
    if (onNavigateRef.current) {
      onNavigateRef.current(link);
    } else {
      window.location.href = link;
    }
  }, []);

  const isMatch = useCallback((step: OnboardingStep, path: string) => {
    if (!step?.urlMatch || !path) return false;

    let match = false;
    if (step.urlMatch.includes('*')) {
      const pattern = step.urlMatch
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\\\*/g, '.*'); // Convert escaped * back to .*
      match = new RegExp(`^${pattern}$`).test(path);
    } else {
      match = path === step.urlMatch;
    }
    return match;
  }, []);

  const simulateClicks = useCallback(
    (stepIndex: number, subStepIndex: number | null) => {
      const currentConfig = configRef.current;
      const actions: string[] = [];
      const path = window.location.pathname;
      const collectStepClicks = (step: OnboardingStep, upToSubStep: number | null = -1) => {
        if (upToSubStep === null) {
            // We are arriving at the main step itself. No sub-steps. 
            // In this case, we don't click the step's attribute because arriving there 
            // should show it. Re-clicking might close it if it's a toggle.
            return;
        }

        if (step.click) actions.push(step.attribute);
        if (step.subSteps) {
          const limit = upToSubStep === -1 ? step.subSteps.length : upToSubStep;
          for (let i = 0; i < limit; i++) {
            if (step.subSteps[i].click) actions.push(step.subSteps[i].attribute);
          }
        }
      };

      for (let i = 0; i <= stepIndex; i++) {
        const step = currentConfig.steps[i];
        if (isMatch(step, path)) {
          if (i < stepIndex) collectStepClicks(step);
          else if (subStepIndex !== null) {
              // We are arriving at a sub-step. Replay clicks leading to it.
              collectStepClicks(step, subStepIndex);
          }
        }
      }

      if (actions.length === 0) return;

      const performClick = (index: number) => {
        if (index >= actions.length) return;
        const attr = actions[index];
        const element = document.querySelector(`[data-onboarding-id="${attr}"]`) as HTMLElement;
        if (element) element.click();
        setTimeout(() => performClick(index + 1), 500);
      };

      setTimeout(() => performClick(0), 500);
    },
    [isMatch, currentPath],
  );

  // Reconcile state with path
  useEffect(() => {
    if (ssr && !isMounted) {
      setIsMounted(true);
      return;
    }

    const currentConfig = configRef.current;
    const isInOrder = (currentConfig.metadata.inOrder as boolean | undefined) !== false;

    // Use functional update to avoid depending on 'state'
    setState((prev) => {
      if (!prev.isActive) return prev;

      const nextState = { ...prev };
      let changed = false;

      if (!isInOrder) {
        const matchedIndex = currentConfig.steps.findIndex(
          (step, index) => isMatch(step, currentPath) && !prev.completedSteps.includes(index),
        );

        if (matchedIndex !== -1 && matchedIndex !== prev.currentStepIndex) {
          nextState.currentStepIndex = matchedIndex;
          nextState.currentSubStepIndex = prev.subStepProgress[matchedIndex] ?? null;
          changed = true;
        }
      } else {
        const firstUnfinishedIndex = currentConfig.steps.findIndex(
          (_, i) => !prev.completedSteps.includes(i),
        );

        if (firstUnfinishedIndex !== -1) {
          if (firstUnfinishedIndex !== prev.currentStepIndex) {
            nextState.currentStepIndex = firstUnfinishedIndex;
            nextState.currentSubStepIndex = prev.subStepProgress[firstUnfinishedIndex] ?? null;
            changed = true;
          }

          const step = currentConfig.steps[firstUnfinishedIndex];
          if (!isMatch(step, currentPath)) {
            if (step.navigate && currentPath !== step.navigate) {
              handleNavigation(step.navigate);
            }
          }
        }
      }

      return changed ? nextState : prev;
    });
  }, [ssr, isMounted, currentPath, handleNavigation, isMatch]);

  // Handle click simulation separately
  useEffect(() => {
    if (!state.isActive || !isMounted) return;
    const currentConfig = configRef.current;
    const step = currentConfig.steps[state.currentStepIndex];

    const simKey = `${currentPath}-${state.currentStepIndex}-${state.currentSubStepIndex}`;

    // Skip if we already simulated this exact state
    if (lastSimulatedKey.current === simKey) {
      return;
    }

    const internal = wasInternalAction.current;
    wasInternalAction.current = false;

    // Skip if path is same and it was an internal action (Next/Prev/GoTo)
    // because manual progression handles its own clicks.
    if (internal && currentPath === lastPathForSimulation.current) {
      lastSimulatedKey.current = simKey;
      return;
    }

    if (step && isMatch(step, currentPath) && currentConfig.metadata.simulateClicksOnNavigate) {
      if (lastSimulatedKey.current !== simKey) {
        lastSimulatedKey.current = simKey;
        lastPathForSimulation.current = currentPath;
        simulateClicks(state.currentStepIndex, state.currentSubStepIndex);
      }
    }
  }, [
    state.currentStepIndex,
    state.currentSubStepIndex,
    state.isActive,
    currentPath,
    isMounted,
    isMatch,
    simulateClicks,
  ]);

  // Persist state to cookies
  useEffect(() => {
    if (isMounted) {
      Cookies.set(COOKIE_NAME, JSON.stringify(state), { expires: 365 });
    }
  }, [state, isMounted]);

  const currentStep = useMemo(() => {
    const step = config.steps[state.currentStepIndex];
    if (!step) return null;

    const isUrlMatch = isMatch(step, currentPath);

    if (state.currentSubStepIndex !== null && step.subSteps) {
      const subStep = step.subSteps[state.currentSubStepIndex];
      if (isUrlMatch || isTransitioning) {
        return subStep || step;
      }
      return null;
    }

    if (!isUrlMatch) return null;

    return step;
  }, [
    config.steps,
    state.currentStepIndex,
    state.currentSubStepIndex,
    currentPath,
    isMatch,
    isTransitioning,
  ]);

  const isFirstStep = state.currentStepIndex === 0 && state.currentSubStepIndex === null;
  const isLastStep = useMemo(() => {
    const totalSteps = config.steps.length;
    const step = config.steps[state.currentStepIndex];
    const hasSubSteps = step?.subSteps && step.subSteps.length > 0;

    if (state.currentStepIndex === totalSteps - 1) {
      if (hasSubSteps) return state.currentSubStepIndex === step.subSteps!.length - 1;
      return true;
    }
    return false;
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex]);

  const nextStep = useCallback(() => {
    const currentConfig = configRef.current;
    wasInternalAction.current = true;

    setState((prev) => {
      const { currentStepIndex, currentSubStepIndex, completedSteps } = prev;
      const stepObj = currentConfig.steps[currentStepIndex];
      if (!stepObj) return prev;

      const currentActiveStep =
        currentSubStepIndex !== null && stepObj.subSteps
          ? stepObj.subSteps[currentSubStepIndex]
          : stepObj;

      if (currentActiveStep.click) {
        const element = document.querySelector(
          `[data-onboarding-id="${currentActiveStep.attribute}"]`,
        ) as HTMLElement;
        if (element) element.click();
      }

      let nextState: OnboardingState;
      let navTo: string | undefined;

      if (
        stepObj.subSteps &&
        (currentSubStepIndex === null || currentSubStepIndex < stepObj.subSteps.length - 1)
      ) {
        const nextSubIndex = currentSubStepIndex === null ? 0 : currentSubStepIndex + 1;
        const nextSubStep = stepObj.subSteps[nextSubIndex];

        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 1000);

        navTo = currentActiveStep.navigate || nextSubStep.navigate;
        if (!navTo && currentSubStepIndex === null) navTo = stepObj.navigate;

        nextState = {
          ...prev,
          currentSubStepIndex: nextSubIndex,
          subStepProgress: {
            ...prev.subStepProgress,
            [currentStepIndex]: nextSubIndex,
          },
        };
      } else {
        const stepIndexToComplete = currentStepIndex;
        if (currentStepIndex < currentConfig.steps.length - 1) {
          const nextIndex = currentStepIndex + 1;
          const nextStepObj = currentConfig.steps[nextIndex];
          const targetSubStepIndex = prev.subStepProgress[nextIndex] ?? null;
          const targetSubStep =
            targetSubStepIndex !== null && nextStepObj.subSteps
              ? nextStepObj.subSteps[targetSubStepIndex]
              : null;

          navTo = currentActiveStep.navigate || nextStepObj.navigate || targetSubStep?.navigate;

          nextState = {
            ...prev,
            currentStepIndex: nextIndex,
            currentSubStepIndex: targetSubStepIndex,
            completedSteps: completedSteps.includes(stepIndexToComplete)
              ? completedSteps
              : [...completedSteps, stepIndexToComplete],
            subStepProgress: {
              ...prev.subStepProgress,
              [stepIndexToComplete]: currentSubStepIndex,
            },
          };
        } else {
          if (currentConfig.onOnboardingComplete) currentConfig.onOnboardingComplete();

          navTo = currentActiveStep.navigate || stepObj.navigate;

          nextState = {
            ...prev,
            isActive: false,
            completedSteps: completedSteps.includes(stepIndexToComplete)
              ? completedSteps
              : [...completedSteps, stepIndexToComplete],
            subStepProgress: {
              ...prev.subStepProgress,
              [stepIndexToComplete]: currentSubStepIndex,
            },
          };
        }
      }

      Cookies.set(COOKIE_NAME, JSON.stringify(nextState), { expires: 365 });
      if (navTo) handleNavigation(navTo);
      return nextState;
    });
  }, [handleNavigation]);

  const prevStep = useCallback(() => {
    const currentConfig = configRef.current;
    wasInternalAction.current = true;
    setState((prev) => {
      let nextState: OnboardingState;
      let navTo: string | undefined;

      if (prev.currentSubStepIndex !== null && prev.currentSubStepIndex > 0) {
        const nextSubIndex = prev.currentSubStepIndex - 1;
        const nextSubStep = currentConfig.steps[prev.currentStepIndex].subSteps![nextSubIndex];
        navTo = nextSubStep.navigate;

        nextState = {
          ...prev,
          currentSubStepIndex: nextSubIndex,
          subStepProgress: {
            ...prev.subStepProgress,
            [prev.currentStepIndex]: nextSubIndex,
          },
        };
      } else if (prev.currentStepIndex > 0 && prev.currentSubStepIndex === 0) {
        const stepObj = currentConfig.steps[prev.currentStepIndex];
        navTo = stepObj.navigate;

        nextState = {
          ...prev,
          currentSubStepIndex: null,
          subStepProgress: {
            ...prev.subStepProgress,
            [prev.currentStepIndex]: null,
          },
        };
      } else if (prev.currentStepIndex > 0) {
        const prevIndex = prev.currentStepIndex - 1;
        const prevStepObj = currentConfig.steps[prevIndex];
        const prevSubStepIndex =
          prev.subStepProgress[prevIndex] ??
          (prevStepObj.subSteps ? prevStepObj.subSteps.length - 1 : null);
        const prevSubStep =
          prevSubStepIndex !== null && prevStepObj.subSteps
            ? prevStepObj.subSteps[prevSubStepIndex]
            : null;

        navTo = prevStepObj.navigate || prevSubStep?.navigate;

        nextState = {
          ...prev,
          currentStepIndex: prevIndex,
          currentSubStepIndex: prevSubStepIndex,
          isActive: true,
          subStepProgress: {
            ...prev.subStepProgress,
            [prevIndex]: prevSubStepIndex,
          },
        };
      } else {
        return prev;
      }

      Cookies.set(COOKIE_NAME, JSON.stringify(nextState), { expires: 365 });
      if (navTo) handleNavigation(navTo);
      return nextState;
    });
  }, [handleNavigation]);

  const finish = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
    if (configRef.current.onOnboardingComplete) configRef.current.onOnboardingComplete();
  }, []);

  const goToStep = useCallback(
    (stepIndex: number, subStepIndex: number | null = null) => {
      const currentConfig = configRef.current;
      wasInternalAction.current = true;
      setState((prev) => {
        const nextStepObj = currentConfig.steps[stepIndex];
        const targetSubStep =
          subStepIndex !== null && nextStepObj.subSteps
            ? nextStepObj.subSteps[subStepIndex]
            : null;

        const navTo = nextStepObj.navigate || targetSubStep?.navigate;

        const nextState = {
          ...prev,
          currentStepIndex: stepIndex,
          currentSubStepIndex: subStepIndex,
          isActive: true,
          subStepProgress: {
            ...prev.subStepProgress,
            [stepIndex]: subStepIndex,
          },
        };

        Cookies.set(COOKIE_NAME, JSON.stringify(nextState), { expires: 365 });
        if (navTo) handleNavigation(navTo);
        return nextState;
      });
    },
    [handleNavigation],
  );

  const value = {
    config,
    state,
    nextStep,
    prevStep,
    finish,
    goToStep,
    currentStep,
    isFirstStep,
    isLastStep,
  };

  if (!isMounted) return <>{children}</>;

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {state.isActive && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined)
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  return context;
};
