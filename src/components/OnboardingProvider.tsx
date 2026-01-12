"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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
  children: React.ReactNode;
}> = ({ config, ssr = false, children }) => {
  const [isMounted, setIsMounted] = useState(!ssr);
  const [state, setState] = useState<OnboardingState>({
    currentStepIndex: 0,
    currentSubStepIndex: null,
    isActive: true,
  });

  // Stabilize config to prevent infinite loops if the user passes a new object on every render
  const configRef = React.useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const handleNavigation = useCallback((link?: string) => {
    if (!link) return;
    
    if (configRef.current.metadata.nextRouter) {
      window.location.href = link;
    } else {
      window.location.href = link;
    }
  }, []);

  useEffect(() => {
    if (ssr) {
      setIsMounted(true);
    }
  }, [ssr]);

  const isMatch = (step: OnboardingStep, path: string) => {
    if (step.urlMatch instanceof RegExp) return step.urlMatch.test(path);
    return path === step.urlMatch;
  };

  useEffect(() => {
    const currentConfig = configRef.current;
    const currentPath = window.location.pathname;
    let matchedStepIndex = -1;
    
    // Check if inOrder is explicitly false to find matching step from URL
    if (currentConfig.metadata.inOrder === false) {
      matchedStepIndex = currentConfig.steps.findIndex(step => isMatch(step, currentPath));
    }

    const savedState = Cookies.get(COOKIE_NAME);
    if (savedState) {
      try {
        const parsed: OnboardingState = JSON.parse(savedState);
        
        // If inOrder is false and we found a matching step
        if (currentConfig.metadata.inOrder === false && matchedStepIndex !== -1) {
          // If the matching step is the same as the saved step, restore the full state (including substeps)
          if (parsed.currentStepIndex === matchedStepIndex) {
            setState(parsed);
          } else {
            // Otherwise, jump to the matching step (resetting substeps)
            setState(prev => ({
              ...prev,
              currentStepIndex: matchedStepIndex,
              currentSubStepIndex: null,
              isActive: true
            }));
          }
        } else {
          // Standard behavior (inOrder: true OR no match found) - restore saved state
          setState(parsed);

          // Only enforce navigation if inOrder is true (or default)
          if (currentConfig.metadata.inOrder !== false) {
            const step = currentConfig.steps[parsed.currentStepIndex];
            if (step && parsed.isActive) {
              // Always enforce location based on the main step's urlMatch
              if (typeof step.urlMatch === 'string' && window.location.pathname !== step.urlMatch) {
                handleNavigation(step.urlMatch);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse onboarding state from cookie', e);
        // Fallback if cookie fails but we have a match
        if (matchedStepIndex !== -1) {
          setState(prev => ({
            ...prev,
            currentStepIndex: matchedStepIndex,
            currentSubStepIndex: null,
            isActive: true
          }));
        }
      }
    } else if (matchedStepIndex !== -1) {
      // No cookie, but we have a URL match
      setState(prev => ({
        ...prev,
        currentStepIndex: matchedStepIndex,
        currentSubStepIndex: null,
        isActive: true
      }));
    } else if (currentConfig.metadata.inOrder !== false) {
      // No cookie, no match, inOrder is true (default).
      // Check if we need to be at the start location
      const step = currentConfig.steps[0];
      if (step && typeof step.urlMatch === 'string' && window.location.pathname !== step.urlMatch) {
         handleNavigation(step.urlMatch);
      }
    }
  }, [handleNavigation]); // Removed config.steps dependency

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
        return state.currentSubStepIndex === (step.subSteps!.length - 1);
      }
      return true;
    }
    return false;
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex]);

  const nextStep = useCallback(() => {
    const currentConfig = configRef.current;
    const step = currentConfig.steps[state.currentStepIndex];
    const currentActiveStep = state.currentSubStepIndex !== null && step.subSteps 
      ? step.subSteps[state.currentSubStepIndex] 
      : step;

    // Perform click if requested for the current step before moving to the next
    if (currentActiveStep.click) {
      const element = document.querySelector(`[data-onboarding-id="${currentActiveStep.attribute}"]`) as HTMLElement;
      if (element) {
        element.click();
      }
    }
    
    // Check for subSteps
    if (step.subSteps && (state.currentSubStepIndex === null || state.currentSubStepIndex < step.subSteps.length - 1)) {
      const nextSubIndex = state.currentSubStepIndex === null ? 0 : state.currentSubStepIndex + 1;
      const nextSubStep = step.subSteps[nextSubIndex];
      setState(prev => ({ ...prev, currentSubStepIndex: nextSubIndex }));
      
      if (nextSubStep.navigate) handleNavigation(nextSubStep.navigate);
      return;
    }

    // Move to next main step
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
      setState(prev => ({ ...prev, isActive: false }));
      if (currentConfig.onOnboardingComplete) {
        currentConfig.onOnboardingComplete();
      }
    }
  }, [state.currentStepIndex, state.currentSubStepIndex, handleNavigation]);

  const prevStep = useCallback(() => {
    const currentConfig = configRef.current;
    const step = currentConfig.steps[state.currentStepIndex];

    if (state.currentSubStepIndex !== null && state.currentSubStepIndex > 0) {
      setState(prev => ({ ...prev, currentSubStepIndex: prev.currentSubStepIndex! - 1 }));
      return;
    }

    if (state.currentSubStepIndex === 0) {
      setState(prev => ({ ...prev, currentSubStepIndex: null }));
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
    setState(prev => ({ ...prev, isActive: false }));
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