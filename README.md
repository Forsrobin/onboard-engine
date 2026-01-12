<p align="center">
  <img src="logo.png" alt="Onboard Engine Logo" width="200" />
</p>

# Onboard Engine

**A modern, lightweight, and customizable onboarding library for React and Next.js applications.**

`onboard-engine` provides a seamless way to guide users through your application using an animated focus overlay, tooltips, and persistent state management. Built with smooth CSS transitions and **Cookies** for state persistence.

![License](https://img.shields.io/npm/l/onboard-engine)
![Version](https://img.shields.io/npm/v/onboard-engine)

## Features

- **Smart Focus Overlay:** Dim the background and highlight the target element.
- **Deeply Customizable:** Custom renderers for buttons and styling options for the overlay.
- **State Persistence:** Remembers the user's progress across page reloads using cookies.
- **Automatic Navigation:** Seamlessly transitions between steps on different pages.
- **Interactive:** Supports click automation and draggable tooltips.
- **SSR Compatible:** Built with Server-Side Rendering (Next.js) in mind.

## Installation

```bash
npm install onboard-engine
# or
yarn add onboard-engine
# or
pnpm add onboard-engine
```

## Getting Started

### 1. Import Styles

Import the necessary CSS in your global stylesheet or root component (e.g., `_app.tsx` or `layout.tsx`).

```tsx
import 'onboard-engine/dist/index.css';
```

### 2. Define Configuration

Create your onboarding configuration object. This defines the steps, metadata, and optional styling.

```tsx
import { OnboardingConfig } from 'onboard-engine';

const onboardingConfig: OnboardingConfig = {
  metadata: {
    name: 'user-onboarding',
    draggable: true, // Allow users to drag the tooltip
    inOrder: true, // Default true. If false, steps can be activated out of order based on URL match.
  },
  steps: [
    {
      title: 'Welcome!',
      description: 'Let us show you around the dashboard.',
      attribute: 'welcome-header',
      urlMatch: '/',
    },
    {
      title: 'Create Project',
      description: 'Click here to start a new project.',
      attribute: 'create-btn',
      navigate: '/dashboard', // Navigate to this page when clicking next
      urlMatch: '/home', // This step is active when on /home
      subSteps: [
        {
          title: 'Project Name',
          description: 'Enter a unique name for your project.',
          attribute: 'project-name-input',
        },
      ],
    },
  ],
  onOnboardingComplete: () => {
    console.log('Onboarding finished!');
  }
};
```

### 3. Wrap Your Application

Wrap your application (or the part you want to onboard) with the `OnboardingProvider`.

```tsx
import { OnboardingProvider } from 'onboard-engine';

export default function App({ children }) {
  return (
    <OnboardingProvider config={onboardingConfig}>
      {children}
    </OnboardingProvider>
  );
}
```

### 4. Tag Your Elements

Add the `data-onboarding-id` attribute to the elements you want to highlight. This must match the `attribute` defined in your config steps.

```tsx
<h1 data-onboarding-id="welcome-header">Welcome to My App</h1>
<button data-onboarding-id="create-btn">Create Project</button>
<input data-onboarding-id="project-name-input" type="text" />
```

## Advanced Configuration

### Custom Styling

You can customize the appearance of the overlay and tooltip through the `style` property in the config. This accepts standard React CSS properties for each element.

```tsx
const config: OnboardingConfig = {
  // ...
  style: {
    // The mask overlaying the page
    background: { backgroundColor: 'rgba(0, 0, 0, 0.85)' },
    
    // The main tooltip container
    container: { 
      borderRadius: '16px', 
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
    },
    
    // Buttons
    next: { backgroundColor: '#4F46E5', color: 'white' },
    prev: { color: '#6B7280' },
    finish: { backgroundColor: '#10B981' },
    start: { backgroundColor: '#4F46E5' }, // Used for the "Next" button on the first step

    // Layout
    padding: 10, // Add 10px padding around the highlighted element
  },
  // ...
};
```

## API Reference

### `OnboardingConfig`

| Property | Type | Description |
| :--- | :--- | :--- |
| `metadata` | `OnboardingMetadata` | General settings for the onboarding instance. |
| `steps` | `OnboardingStep[]` | Array of steps defining the flow. |
| `style` | `OnboardingStyle` | Optional. Visual styling configuration. |
| `onOnboardingComplete` | `() => void` | Optional. Callback fired when onboarding finishes. |

### `OnboardingMetadata`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Required** | Unique name for the onboarding flow. |
| `nextRouter` | `boolean` | `false` | Enable if using Next.js router. |
| `draggable` | `boolean` | `false` | Allow the tooltip to be dragged. |
| `inOrder` | `boolean` | `true` | If `true`, strict step order is enforced. If `false`, matching `urlMatch` activates the step. |

### `OnboardingStep`

| Property | Type | Description |
| :--- | :--- | :--- |
| `title` | `string` | Title displayed in the tooltip. |
| `description` | `string` | Description text in the tooltip. |
| `attribute` | `string` | The `data-onboarding-id` value to target. |
| `urlMatch` | `string` \| `RegExp` | **Required**. Checks if current URL matches to active this step. Supports `*` wildcards in strings (e.g., `"/user/*"`). <br/>**Note:** `RegExp` objects cannot be passed from Server Components in Next.js. Use string wildcards or define config in a Client Component. |
| `navigate` | `string` | URL to navigate to when this step is completed (next button clicked). |
| `click` | `boolean` | If `true`, clicks the element when the step activates. |
| `subSteps` | `OnboardingSubStep[]` | Nested steps for complex workflows. |

### `OnboardingStyle`

All properties (except `padding`) accept `React.CSSProperties` objects.

| Property | Type | Description |
| :--- | :--- | :--- |
| `background` | `CSSProperties` | Styles for the overlay mask. |
| `container` | `CSSProperties` | Styles for the tooltip box. |
| `next` | `CSSProperties` | Styles for the "Next" button. |
| `prev` | `CSSProperties` | Styles for the "Prev" button. |
| `finish` | `CSSProperties` | Styles for the "Finish" button. |
| `start` | `CSSProperties` | Styles for the "Start" button (Step 1 "Next" button). |
| `padding` | `number` | Padding (in px) around the highlighted element. |

## Hooks

### `useOnboarding()`

Access the onboarding state and controls from any component within the provider.

```tsx
import { useOnboarding } from 'onboard-engine';

const MyComponent = () => {
  const { 
    // Actions
    nextStep,   // Go to the next step
    prevStep,   // Go to the previous step
    finish,     // End the onboarding flow
    goToStep,   // Jump to a specific step (index, subStepIndex?)

    // State
    state,      // The full internal state object
    currentStep,// The current OnboardingStep or OnboardingSubStep object
    isFirstStep,// Boolean: true if on the first step
    isLastStep, // Boolean: true if on the last step
    
    // Configuration
    config      // The full configuration object
  } = useOnboarding();

  return (
    <button onClick={nextStep}>Next</button>
  );
};
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC © [Forsrobin](https://github.com/Forsrobin)