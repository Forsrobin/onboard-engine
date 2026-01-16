'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useEffectEvent,
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

export const OnboardingProvider: React.FC<{
  config: OnboardingConfig;
  ssr?: boolean;
  onNavigate?: (url: string) => void;
  children: React.ReactNode;
}> = ({ config, ssr = false, onNavigate, children }) => {
  const [isMounted, setIsMounted] = useState(!ssr);
  const [state, setState] = useState<OnboardingState>({
    currentStepIndex: 0,
    currentSubStepIndex: null,
    isActive: true,
  });

  const configRef = React.useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const onNavigateRef = React.useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const handleNavigation = useCallback(
    (link?: string) => {
      if (!link) return;

      if (onNavigateRef.current) {
        onNavigateRef.current(link);
      } else if (config.metadata.nextRouter) {
        window.location.href = link;
      } else {
        window.location.href = link;
      }
    },
    [config.metadata.nextRouter],
  );

  useEffect(() => {
    if (ssr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMounted(true);
    }
  }, [ssr]);

  const isMatch = (step: OnboardingStep, path: string) => {
    if (step.urlMatch instanceof RegExp) return step.urlMatch.test(path);

    if (typeof step.urlMatch === 'string' && step.urlMatch.includes('*')) {
      const pattern = step.urlMatch.replace(/[.+?^${}()|[\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(path);
    }

    return path === step.urlMatch;
  };

  const onRestoreState = useEffectEvent(() => {
    const currentConfig = configRef.current;
    const currentPath = window.location.pathname;
    let matchedStepIndex = -1;

    if ((currentConfig.metadata.inOrder as boolean | undefined) === false) {
      matchedStepIndex = currentConfig.steps.findIndex((step) => isMatch(step, currentPath));
    }

    const savedState = Cookies.get(COOKIE_NAME);
    if (savedState) {
      try {
        const parsed: OnboardingState = JSON.parse(savedState);

        if ((currentConfig.metadata.inOrder as boolean | undefined) === false) {
          if (matchedStepIndex !== -1) {
            if (parsed.currentStepIndex === matchedStepIndex) {
              setState(parsed);
            } else {
              setState({
                currentStepIndex: matchedStepIndex,
                currentSubStepIndex: null,
                isActive: true,
              });
            }
          } else {
            setState({ ...parsed, isActive: false });
          }
        } else {
          setState(parsed);

          if ((currentConfig.metadata.inOrder as boolean | undefined) !== false) {
            const step = currentConfig.steps[parsed.currentStepIndex];
            if (step && parsed.isActive) {
              let targetUrl: string | undefined;

              if (parsed.currentStepIndex > 0) {
                const prevStep = currentConfig.steps[parsed.currentStepIndex - 1];
                if (prevStep.navigate) {
                  targetUrl = prevStep.navigate;
                }
              }

              if (!targetUrl && typeof step.urlMatch === 'string') {
                targetUrl = step.urlMatch;
              }

              if (targetUrl && window.location.pathname !== targetUrl) {
                handleNavigation(targetUrl);
              }

              if (currentConfig.metadata.simulateClicksOnNavigate) {
                if (parsed.currentSubStepIndex !== null && step.click) {
                  setTimeout(() => {
                    const element = document.querySelector(
                      `[data-onboarding-id="${step.attribute}"]`,
                    ) as HTMLElement;
                    if (element) {
                      element.click();
                    }
                  }, 500);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse onboarding state from cookie', e);
        if (matchedStepIndex !== -1) {
          setState({
            currentStepIndex: matchedStepIndex,
            currentSubStepIndex: null,
            isActive: true,
          });
        }
      }
    } else if (matchedStepIndex !== -1) {
      setState({
        currentStepIndex: matchedStepIndex,
        currentSubStepIndex: null,
        isActive: true,
      });
    } else if ((currentConfig.metadata.inOrder as boolean | undefined) === false) {
      setState((prev) => ({ ...prev, isActive: false }));
    } else {
      const step = currentConfig.steps[0];
      if (step && typeof step.urlMatch === 'string' && window.location.pathname !== step.urlMatch) {
        handleNavigation(step.urlMatch);
      }
    }
  });

  useEffect(() => {
    onRestoreState();
  }, []);

  useEffect(() => {
    if (isMounted) {
      Cookies.set(COOKIE_NAME, JSON.stringify(state), { expires: 365 });
    }
  }, [state, isMounted]);

  const currentStep = useMemo(() => {
    const step = config.steps[state.currentStepIndex];
    if (!step) return null;
    if (state.currentSubStepIndex !== null && step.subSteps) {
      return step.subSteps[state.currentSubStepIndex] || step;
    }
    return step;
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex]);

  const isFirstStep = state.currentStepIndex === 0 && state.currentSubStepIndex === null;
  const isLastStep = useMemo(() => {
    const totalSteps = config.steps.length;
    const isLastMainStep = state.currentStepIndex === totalSteps - 1;
    const step = config.steps[state.currentStepIndex];
    const hasSubSteps = step?.subSteps && step.subSteps.length > 0;

    if (isLastMainStep) {
      if (hasSubSteps) {
        return state.currentSubStepIndex === step.subSteps!.length - 1;
      }
      return true;
    }
    return false;
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex]);

  const nextStep = useCallback(() => {
    const currentConfig = configRef.current;
    const stepObj = currentConfig.steps[state.currentStepIndex];
    const currentActiveStep =
      state.currentSubStepIndex !== null && stepObj.subSteps
        ? stepObj.subSteps[state.currentSubStepIndex]
        : stepObj;

    if (currentActiveStep.click) {
      const element = document.querySelector(
        `[data-onboarding-id="${currentActiveStep.attribute}"]`,
      ) as HTMLElement;
      if (element) {
        element.click();
      }
    }

    if (
      stepObj.subSteps &&
      (state.currentSubStepIndex === null ||
        state.currentSubStepIndex < stepObj.subSteps.length - 1)
    ) {
      const nextSubIndex = state.currentSubStepIndex === null ? 0 : state.currentSubStepIndex + 1;
      const nextSubStep = stepObj.subSteps[nextSubIndex];
      setState((prev) => ({ ...prev, currentSubStepIndex: nextSubIndex }));

      if (nextSubStep.navigate) handleNavigation(nextSubStep.navigate);
      return;
    }

    if (state.currentStepIndex < currentConfig.steps.length - 1) {
      const nextIndex = state.currentStepIndex + 1;
      const nextStepObj = currentConfig.steps[nextIndex];
      setState({
        currentStepIndex: nextIndex,
        currentSubStepIndex: null,
        isActive: true,
      });

      if (nextStepObj.navigate) handleNavigation(nextStepObj.navigate);
    } else {
      setState((prev) => ({ ...prev, isActive: false }));
      if (currentConfig.onOnboardingComplete) {
        currentConfig.onOnboardingComplete();
      }
    }
  }, [state.currentStepIndex, state.currentSubStepIndex, handleNavigation]);

  const prevStep = useCallback(() => {
    const currentConfig = configRef.current;

    if (state.currentSubStepIndex !== null && state.currentSubStepIndex > 0) {
      setState((prev) => ({ ...prev, currentSubStepIndex: prev.currentSubStepIndex! - 1 }));
      return;
    }

    if (state.currentStepIndex > 0 && state.currentSubStepIndex === 0) {
      setState((prev) => ({ ...prev, currentSubStepIndex: null }));
      return;
    }

    if (state.currentStepIndex > 0) {
      const prevIndex = state.currentStepIndex - 1;
      const prevStepObj = currentConfig.steps[prevIndex];
      const prevSubStepIndex = prevStepObj.subSteps ? prevStepObj.subSteps.length - 1 : null;

      setState({
        currentStepIndex: prevIndex,
        currentSubStepIndex: prevSubStepIndex,
        isActive: true,
      });
    }
  }, [state.currentStepIndex, state.currentSubStepIndex]);

  const finish = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
    if (configRef.current.onOnboardingComplete) {
      configRef.current.onOnboardingComplete();
    }
  }, []);

  const goToStep = useCallback((stepIndex: number, subStepIndex: number | null = null) => {
    setState({
      currentStepIndex: stepIndex,
      currentSubStepIndex: subStepIndex,
      isActive: true,
    });
  }, []);

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
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
