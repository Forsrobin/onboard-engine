"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useOnboarding } from './OnboardingProvider';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export const OnboardingOverlay: React.FC = () => {
  const { config, currentStep, nextStep, prevStep, finish, isFirstStep, isLastStep } = useOnboarding();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculateBestPosition = useCallback((rect: DOMRect) => {
    const tooltipWidth = 300;
    const tooltipHeight = 200;
    const gap = 12;
    const padding = 20;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    let top = 0;
    let left = 0;

    if (spaceBelow > tooltipHeight + gap + padding) {
      top = rect.bottom + gap;
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, rect.left + rect.width / 2 - tooltipWidth / 2));
    } else if (spaceAbove > tooltipHeight + gap + padding) {
      top = rect.top - tooltipHeight - gap;
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, rect.left + rect.width / 2 - tooltipWidth / 2));
    } else if (spaceRight > tooltipWidth + gap + padding) {
      top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, rect.top + rect.height / 2 - tooltipHeight / 2));
      left = rect.right + gap;
    } else if (spaceLeft > tooltipWidth + gap + padding) {
      top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, rect.top + rect.height / 2 - tooltipHeight / 2));
      left = rect.left - tooltipWidth - gap;
    } else {
      top = window.innerHeight / 2 - tooltipHeight / 2;
      left = window.innerWidth / 2 - tooltipWidth / 2;
    }

    return { top: top + window.scrollY, left: left + window.scrollX };
  }, []);

  const updateCoords = useCallback(() => {
    if (!currentStep) return;

    const element = document.querySelector(`[data-onboarding-id="${currentStep.attribute}"]`) as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      setPosition(calculateBestPosition(rect));
    } else {
      setCoords(null);
    }
  }, [currentStep, calculateBestPosition]);

  useEffect(() => {
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);

    const observer = new MutationObserver(updateCoords);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      observer.disconnect();
    };
  }, [updateCoords]);

  if (!currentStep || !coords) return null;

  const transition = { type: 'spring', damping: 25, stiffness: 200 };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const overlayContent = (
    <div className="fixed inset-0 z-[999999] pointer-events-none">
      {/* Top Mask */}
      <motion.div
        initial={false}
        animate={{ height: coords.top }}
        transition={transition}
        className="onboard-overlay-mask top-0 left-0 w-full pointer-events-auto"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      {/* Bottom Mask */}
      <motion.div
        initial={false}
        animate={{ top: coords.top + coords.height, height: `calc(100vh - ${coords.top + coords.height}px)` }}
        transition={transition}
        className="onboard-overlay-mask left-0 w-full pointer-events-auto"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      {/* Left Mask */}
      <motion.div
        initial={false}
        animate={{ top: coords.top, height: coords.height, width: coords.left }}
        transition={transition}
        className="onboard-overlay-mask left-0 pointer-events-auto"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      {/* Right Mask */}
      <motion.div
        initial={false}
        animate={{ 
          top: coords.top, 
          height: coords.height, 
          left: coords.left + coords.width, 
          width: `calc(100% - ${coords.left + coords.width}px)` 
        }}
        transition={transition}
        className="onboard-overlay-mask pointer-events-auto"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          top: position.top,
          left: position.left
        }}
        drag={config.metadata.draggable}
        dragMomentum={false}
        transition={transition}
        className="onboard-tooltip pointer-events-auto"
        style={{ zIndex: 1000000 }}
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontWeight: 'bold', color: '#111827', fontSize: '18px', lineHeight: 1.2 }}>{currentStep.title}</h3>
          <button 
            onClick={(e) => { e.stopPropagation(); finish(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
          >
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
          {currentStep.description}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={(e) => { e.stopPropagation(); prevStep(); }}
            disabled={isFirstStep}
            className="onboard-button-ghost"
            style={{ background: 'none', border: 'none', cursor: isFirstStep ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); nextStep(); }}
            className="onboard-button-primary"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(overlayContent, document.body) 
    : null;
};
