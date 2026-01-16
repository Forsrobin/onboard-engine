'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding } from './OnboardingProvider';

export const OnboardingOverlay: React.FC = () => {
  const { config, currentStep, nextStep, prevStep, finish, isFirstStep, isLastStep } =
    useOnboarding();
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [currentStep]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;

    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    setDragOffset({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;

    if (tooltipRef.current) {
      tooltipRef.current.style.transition =
        'top 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
      tooltipRef.current.style.cursor = config.metadata.draggable ? 'grab' : 'auto';
    }

    window.removeEventListener('pointermove', handlePointerMove);
    // eslint-disable-next-line react-hooks/immutability
    window.removeEventListener('pointerup', handlePointerUp);
  }, [config.metadata.draggable, handlePointerMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!config.metadata.draggable) return;
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };

    if (tooltipRef.current) {
      tooltipRef.current.style.transition = 'none';
      tooltipRef.current.style.cursor = 'grabbing';
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const calculateBestPosition = useCallback(
    (rect: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      width: number;
      height: number;
    }) => {
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
        left = Math.max(
          padding,
          Math.min(
            window.innerWidth - tooltipWidth - padding,
            rect.left + rect.width / 2 - tooltipWidth / 2,
          ),
        );
      } else if (spaceAbove > tooltipHeight + gap + padding) {
        top = rect.top - tooltipHeight - gap;
        left = Math.max(
          padding,
          Math.min(
            window.innerWidth - tooltipWidth - padding,
            rect.left + rect.width / 2 - tooltipWidth / 2,
          ),
        );
      } else if (spaceRight > tooltipWidth + gap + padding) {
        top = Math.max(
          padding,
          Math.min(
            window.innerHeight - tooltipHeight - padding,
            rect.top + rect.height / 2 - tooltipHeight / 2,
          ),
        );
        left = rect.right + gap;
      } else if (spaceLeft > tooltipWidth + gap + padding) {
        top = Math.max(
          padding,
          Math.min(
            window.innerHeight - tooltipHeight - padding,
            rect.top + rect.height / 2 - tooltipHeight / 2,
          ),
        );
        left = rect.left - tooltipWidth - gap;
      } else {
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
      }

      return { top: top + window.scrollY, left: left + window.scrollX };
    },
    [],
  );

  const updateCoords = useCallback(() => {
    if (!currentStep) return;

    const element = document.querySelector(
      `[data-onboarding-id="${currentStep.attribute}"]`,
    ) as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      const padding = config.style?.padding || 0;

      const paddedRect = {
        top: rect.top - padding,
        bottom: rect.bottom + padding,
        left: rect.left - padding,
        right: rect.right + padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };

      const newCoords = {
        top: paddedRect.top + window.scrollY,
        left: paddedRect.left + window.scrollX,
        width: paddedRect.width,
        height: paddedRect.height,
      };

      const newPosition = calculateBestPosition(paddedRect);

      setCoords((prev) => {
        if (
          prev &&
          prev.top === newCoords.top &&
          prev.left === newCoords.left &&
          prev.width === newCoords.width &&
          prev.height === newCoords.height
        ) {
          return prev;
        }
        return newCoords;
      });

      setPosition((prev) => {
        if (prev.top === newPosition.top && prev.left === newPosition.left) {
          return prev;
        }
        return newPosition;
      });
    } else {
      setCoords(null);
    }
  }, [currentStep, calculateBestPosition, config.style]);

  useEffect(() => {
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);

    const observer = new MutationObserver(updateCoords);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateCoords);
      resizeObserver.observe(document.body);

      const element = currentStep?.attribute
        ? document.querySelector(`[data-onboarding-id="${currentStep.attribute}"]`)
        : null;
      if (element) {
        resizeObserver.observe(element);
      }
    }

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateCoords, currentStep?.attribute]);

  if (!currentStep || !coords) return null;

  const maskStyle = {
    ...config.style?.background,
    transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const ChevronLeftIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );

  const XIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const overlayContent = (
    <div className="onboard-overlay-container">
      <div
        style={{ height: coords.top, ...maskStyle }}
        className="onboard-overlay-mask onboard-mask-top"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      <div
        style={{
          top: coords.top + coords.height,
          height: `calc(100vh - ${coords.top + coords.height}px)`,
          ...maskStyle,
        }}
        className="onboard-overlay-mask onboard-mask-bottom"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      <div
        style={{ top: coords.top, height: coords.height, width: coords.left, ...maskStyle }}
        className="onboard-overlay-mask onboard-mask-left"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />
      <div
        style={{
          top: coords.top,
          height: coords.height,
          left: coords.left + coords.width,
          width: `calc(100% - ${coords.left + coords.width}px)`,
          ...maskStyle,
        }}
        className="onboard-overlay-mask"
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      />

      <div
        ref={tooltipRef}
        className="onboard-tooltip"
        onPointerDown={handlePointerDown}
        style={{
          zIndex: 1000000,
          ...config.style?.container,
          top: position.top + dragOffset.y,
          left: position.left + dragOffset.x,
          transition:
            'top 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          cursor: config.metadata.draggable ? 'grab' : 'auto',
          touchAction: 'none',
        }}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <div className="onboard-tooltip-header">
          <h3 className="onboard-tooltip-title">{currentStep.title}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="onboard-close-button"
          >
            <XIcon />
          </button>
        </div>
        <p className="onboard-tooltip-description">{currentStep.description}</p>

        <div className="onboard-tooltip-footer">
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevStep();
            }}
            disabled={isFirstStep}
            className="onboard-button-ghost"
            style={{
              background: 'none',
              border: 'none',
              cursor: isFirstStep ? 'not-allowed' : 'pointer',
              ...config.style?.prev,
            }}
          >
            <ChevronLeftIcon />
            Prev
          </button>

          {isLastStep ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="onboard-button-primary"
              style={{ border: 'none', cursor: 'pointer', ...config.style?.finish }}
            >
              Finish
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextStep();
              }}
              className="onboard-button-primary"
              style={{
                border: 'none',
                cursor: 'pointer',
                ...(isFirstStep ? config.style?.start : {}),
                ...(!isFirstStep ? config.style?.next : {}),
              }}
            >
              {isFirstStep && config.style?.start ? 'Start' : 'Next'}
              {!(isFirstStep && config.style?.start) && <ChevronRightIcon />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlayContent, document.body) : null;
};
