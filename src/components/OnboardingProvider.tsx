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

  const handleNavigation = useCallback((link?: string) => {
    if (!link) return;
    
    if (config.metadata.nextRouter) {
      window.location.href = link;
    } else {
      window.location.href = link;
    }
  }, [config.metadata.nextRouter]);

  useEffect(() => {
    if (ssr) {
      setIsMounted(true);
    }
  }, [ssr]);

  useEffect(() => {
    const savedState = Cookies.get(COOKIE_NAME);
    if (savedState) {
      try {
        const parsed: OnboardingState = JSON.parse(savedState);
        setState(parsed);

        const step = config.steps[parsed.currentStepIndex];
        if (step && parsed.isActive) {
          const targetLink = parsed.currentSubStepIndex !== null && step.subSteps 
            ? step.subSteps[parsed.currentSubStepIndex].link 
            : step.link;

          if (targetLink && window.location.pathname !== targetLink) {
            handleNavigation(targetLink);
          }
        }
      } catch (e) {
        console.error('Failed to parse onboarding state from cookie', e);
      }
    }
  }, [config.steps, handleNavigation]);

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
    const step = config.steps[state.currentStepIndex];
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
      
      const shouldNavigate = currentActiveStep.navigateAutomatically !== false;
      if (nextSubStep.link && shouldNavigate) handleNavigation(nextSubStep.link);
      return;
    }

    // Move to next main step
    if (state.currentStepIndex < config.steps.length - 1) {
      const nextIndex = state.currentStepIndex + 1;
      const nextStepObj = config.steps[nextIndex];
      setState({
        currentStepIndex: nextIndex,
        currentSubStepIndex: null,
        isActive: true,
      });
      
      const shouldNavigate = currentActiveStep.navigateAutomatically !== false;
      if (nextStepObj.link && shouldNavigate) handleNavigation(nextStepObj.link);
    } else {
      setState(prev => ({ ...prev, isActive: false }));
    }
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex, handleNavigation]);

  const prevStep = useCallback(() => {
    const step = config.steps[state.currentStepIndex];

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
      const prevStepObj = config.steps[prevIndex];
      const prevSubStepIndex = prevStepObj.subSteps ? prevStepObj.subSteps.length - 1 : null;
      
      setState({
        currentStepIndex: prevIndex,
        currentSubStepIndex: prevSubStepIndex,
        isActive: true,
      });
    }
  }, [config.steps, state.currentStepIndex, state.currentSubStepIndex]);

  const finish = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
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