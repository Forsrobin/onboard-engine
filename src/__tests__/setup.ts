import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.location.href to avoid JSDOM navigation error
const originalLocation = window.location;
delete (window as any).location;
window.location = {
  ...originalLocation,
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
} as any;

Object.defineProperty(window.location, 'href', {
  writable: true,
  value: 'http://localhost/',
});
