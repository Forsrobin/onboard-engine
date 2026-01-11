# onboard-engine

A modern, animated, and persistent onboarding tool for React and Next.js applications. It uses Framer Motion for smooth transitions and cookies to maintain state across sessions and page refreshes.

## Installation

Install the package via npm:

```bash
npm install onboard-engine
```

## Features

- Server-side support for Next.js and React.
- Animated focus effect using a four-panel overlay system.
- Cookie-based persistence to keep the user's progress.
- Support for nested sub-steps and dynamic navigation.
- Customizable configuration for titles, descriptions, and attributes.

## Basic Usage

### 1. Style Import

Import the required CSS in your root file (e.g., layout.tsx or _app.tsx):

```tsx
import 'onboard-engine/dist/index.css';
```

### 2. Provider Setup

Wrap your application with the OnboardingProvider.

```tsx
import { OnboardingProvider, OnboardingConfig } from 'onboard-engine';

const onboardingConfig: OnboardingConfig = {
  metadata: {
    name: 'My Application Onboarding',
    nextRouter: true
  },
  steps: [
    {
      title: 'Welcome to the Dashboard',
      description: 'This is where you can see all your recent activities.',
      attribute: 'dashboard-header',
      link: '/dashboard'
    },
    {
      title: 'Create a Project',
      description: 'Click here to start your first project.',
      attribute: 'create-project-btn',
      link: '/dashboard',
      subSteps: [
        {
          title: 'Project Name',
          description: 'Give your project a unique name.',
          attribute: 'project-name-input'
        }
      ]
    }
  ]
};

export default function RootLayout({ children }) {
  return (
    <OnboardingProvider config={onboardingConfig} ssr={true}>
      {children}
    </OnboardingProvider>
  );
}
```

### 3. Tagging Elements

Add the data-onboarding-id attribute to the HTML elements you want to highlight.

```tsx
<button data-onboarding-id="create-project-btn">
  Create Project
</button>
```

## Configuration Reference

### OnboardingConfig

| Property | Type | Description |
| :--- | :--- | :--- |
| metadata | OnboardingMetadata | General settings for the onboarding instance. |
| steps | OnboardingStep[] | An array of steps defining the onboarding flow. |

### OnboardingMetadata

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| name | string | Required | The name of the onboarding flow. |
| nextRouter | boolean | false | If true, the engine prepares for Next.js router transitions. |
| draggable | boolean | false | If true, allows users to drag the tooltip around the screen. |

### OnboardingStep

| Property | Type | Description |
| :--- | :--- | :--- |
| title | string | The title displayed in the tooltip. |
| description | string | The description text displayed in the tooltip. |
| attribute | string | The value of the data-onboarding-id attribute to target. |
| link | string (optional) | The URL path to navigate to when this step is reached. |
| click | boolean (optional) | If true, the engine will programmatically click the element when the step starts. |
| navigateAutomatically | boolean (optional) | Default true. If false, the engine won't perform URL navigation when moving to the next step. |
| subSteps | OnboardingSubStep[] (optional) | Nested steps that occur on the same page or within a workflow. |

### OnboardingSubStep

Sub-steps share the same properties as main steps but are focused on handling nested UI elements like modals or multi-step forms.

| Property | Type | Description |
| :--- | :--- | :--- |
| title | string | Title for the sub-step. |
| description | string | Description for the sub-step. |
| attribute | string | The attribute ID of the element to focus (using data-onboarding-id). |
| link | string (optional) | Optional navigation link. |
| click | boolean (optional) | If true, programmatically clicks the element when the sub-step starts. |
| navigateAutomatically | boolean (optional) | Default true. If false, prevents automatic URL navigation. |

## Smart Positioning

The engine automatically calculates the best position for the tooltip relative to the focused element. It checks for available space in the following order:
1. Below the element.
2. Above the element.
3. To the right of the element.
4. To the left of the element.
5. Centered on the screen (fallback).

This ensures the onboarding instructions are always visible regardless of where the target element is located on the page.

## Provider Properties

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| config | OnboardingConfig | Required | The configuration object for the onboarding. |
| ssr | boolean | false | Set to true when using with Next.js to handle hydration properly. |

## Hooks

### useOnboarding

Access the onboarding state and controls from any component within the provider.

```tsx
const { 
  nextStep, 
  prevStep, 
  finish, 
  state, 
  currentStep, 
  isFirstStep, 
  isLastStep 
} = useOnboarding();
```

## Persistence

The state is stored in a cookie named onboarding_state. This ensures that:
- Refreshing the page keeps the user on the current step.
- Returning to the site later resumes the onboarding from where it was left.
- Navigating between different pages (if links are provided in the config) maintains the workflow.

## Navigation Logic

If a step has a link property, the engine will automatically check the current window.location.pathname. If the current path does not match the step's link, it will perform a navigation to ensure the user is on the correct page to see the highlighted element.
