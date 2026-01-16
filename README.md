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
# or
bun add onboard-engine
```

## Getting Started

### 1. Import Styles

> **Important:** You must import the CSS for the overlay and tooltip to render correctly.

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
    draggable: true,
    inOrder: true,
    simulateClicksOnNavigate: true, // Re-activates parent clicks (like opening a modal) on page refresh
  },
  steps: [
    {
      title: 'Welcome!',
      description: 'Let us show you around the dashboard.',
      attribute: 'welcome-header',
      urlMatch: '/',
      urlBase: '/',
      navigate: '/home',
    },
    {
      title: 'Create Project',
      description: 'Click here to start a new project.',
      attribute: 'create-btn',
      urlMatch: '/home',
      urlBase: '/home',
      navigate: '/dashboard',
      click: true, // Clicks the button automatically when moving to the next step
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
  },
};
```

### 3. Wrap Your Application

Wrap your application (or the part you want to onboard) with the `OnboardingProvider`.

```tsx
import { OnboardingProvider } from 'onboard-engine';

export default function App({ children }) {
  return (
    <OnboardingProvider
      config={onboardingConfig}
      onNavigate={(url) => console.log('Navigating to', url)}
    >
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

## API Reference

### `OnboardingProvider` Props

| Property     | Type                    | Description                                                                         |
| :----------- | :---------------------- | :---------------------------------------------------------------------------------- |
| `config`     | `OnboardingConfig`      | **Required**. The configuration object for the onboarding flow.                     |
| `ssr`        | `boolean`               | Optional. Set to `true` if using Server-Side Rendering.                             |
| `onNavigate` | `(url: string) => void` | Optional. Custom navigation handler (e.g. for `next/navigation` or `react-router`). |

### `OnboardingMetadata`

| Property                   | Type      | Default  | Description                                                                                   |
| :------------------------- | :-------- | :------- | :-------------------------------------------------------------------------------------------- |
| `name`                     | `string`  | Required | Unique name for the onboarding flow.                                                          |
| `nextRouter`               | `boolean` | `false`  | Enable if using Next.js router.                                                               |
| `draggable`                | `boolean` | `false`  | Allow the tooltip to be dragged.                                                              |
| `inOrder`                  | `boolean` | `true`   | If `true`, strict step order is enforced. If `false`, matching `urlMatch` activates the step. |
| `simulateClicksOnNavigate` | `boolean` | `false`  | If `true`, re-triggers the parent step's `click` when resuming in a sub-step after a refresh. |

### `OnboardingStep`

| Property      | Type                  | Description                                                                                                                                                                                                                                                              |
| :------------ | :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`              | Title displayed in the tooltip.                                                                                                                                                                                                                                          |
| `description` | `string`              | Description text in the tooltip.                                                                                                                                                                                                                                         |
| `attribute`   | `string`              | The `data-onboarding-id` value to target.                                                                                                                                                                                                                                |
| `urlMatch`    | `string` \| `RegExp`  | **Required**. Checks if current URL matches to active this step. Supports `*` wildcards in strings (e.g., `"/user/*"`). <br/>**Note:** `RegExp` objects cannot be passed from Server Components in Next.js. Use string wildcards or define config in a Client Component. |
| `urlBase`     | `string`              | **Required**. The base URL for this step. If `inOrder` is true, the user will be navigated here if they are on a non-matching page.                                                                                                                                      |
| `navigate`    | `string`              | URL to navigate to when this step is completed (next button clicked).                                                                                                                                                                                                    |
| `click`       | `boolean`             | If `true`, clicks the element when the step activates.                                                                                                                                                                                                                   |
| `subSteps`    | `OnboardingSubStep[]` | Nested steps for complex workflows.                                                                                                                                                                                                                                      |

## Hooks

### `useOnboarding()`

Access the onboarding state and controls from any component within the provider.

```tsx
import { useOnboarding } from 'onboard-engine';

const MyComponent = () => {
  const {
    nextStep,
    prevStep,
    finish,
    goToStep,
    state,
    currentStep,
    isFirstStep,
    isLastStep,
    config,
  } = useOnboarding();

  return <button onClick={nextStep}>Next</button>;
};
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC © [Forsrobin](https://github.com/Forsrobin)
