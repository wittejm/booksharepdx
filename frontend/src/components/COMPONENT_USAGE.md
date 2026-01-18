# BookSharePDX Shared UI Components

Complete documentation and usage examples for the shared UI component library.

## Components Overview

### 1. Toast Notification System

A flexible notification system with auto-dismiss, stacking, and mobile responsiveness.

#### Files
- `Toast.tsx` - Individual toast component
- `useToast.tsx` - React hook for managing toasts
- `ToastContainer.tsx` - Container component to render all toasts

#### Features
- **Types**: success, error, warning, info
- **Position**: top-right on desktop, top-center on mobile
- **Auto-dismiss**: Configurable duration (default: 3 seconds)
- **Close button**: Manual dismiss option
- **Stacking**: Multiple toasts stack vertically
- **Icons**: Visual indicators for each type
- **Animations**: Smooth fade-in animation

#### Usage

```tsx
import { useToast, ToastContainer } from '@/components';
import { useState } from 'react';

function MyComponent() {
  const { toasts, success, error, warning, info, dismiss } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <button onClick={() => success('Operation successful!')}>
        Show Success Toast
      </button>

      <button onClick={() => error('Something went wrong!')}>
        Show Error Toast
      </button>

      <button onClick={() => warning('Please be careful')}>
        Show Warning Toast
      </button>

      <button onClick={() => info('Here is some info')}>
        Show Info Toast
      </button>
    </>
  );
}
```

#### API

```typescript
interface UseToastReturn {
  toasts: ToastMessage[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
```

#### Styling
- Success: Green background with checkmark icon
- Error: Red background with alert icon
- Warning: Yellow background with alert triangle icon
- Info: Blue background with info icon

---

### 2. Modal Component

A reusable, accessible modal dialog with backdrop click and keyboard handling.

#### File
- `Modal.tsx`

#### Features
- **Accessible**: ARIA labels, focus trap, keyboard navigation
- **Dismiss Options**: Esc key, click outside, close button
- **Responsive**: Works on all screen sizes
- **Animations**: Smooth fade-in and slide-up animations
- **Sizes**: sm, md, lg
- **Mobile Friendly**: Adapts to smaller screens

#### Usage

```tsx
import { useState } from 'react';
import { Modal } from '@/components';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Modal Title"
        size="md"
        showCloseButton={true}
      >
        <p>Modal content goes here</p>
        <button onClick={() => setOpen(false)}>Close</button>
      </Modal>
    </>
  );
}
```

#### Props

```typescript
interface ModalProps {
  open: boolean;                    // Controls modal visibility
  onClose: () => void;              // Callback when modal should close
  title?: string;                   // Optional modal title
  children: React.ReactNode;        // Modal content
  size?: 'sm' | 'md' | 'lg';       // Modal width (default: 'md')
  showCloseButton?: boolean;        // Show X button (default: true)
}
```

#### Accessibility
- Focus trap: Keyboard focus stays within modal
- Keyboard navigation: Esc key closes modal
- Click outside: Clicking backdrop closes modal
- ARIA labels: Proper semantic markup

---

## Integration Guide

### Setting up the Toast System in Your App

The Toast system needs to be set up at the top level of your application:

```tsx
// In App.tsx or root component
import { useToast, ToastContainer } from '@/components';
import { ReactNode, createContext, useContext } from 'react';

// Create a context for toast (optional, for global access)
const ToastContext = createContext<ReturnType<typeof useToast> | null>(null);

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      {children}
    </ToastContext.Provider>
  );
}

// In App.tsx
function App() {
  return (
    <ToastProvider>
      <Router>
        {/* Your routes */}
      </Router>
    </ToastProvider>
  );
}
```

---

## Styling and Customization

### Tailwind Classes Used

The components use standard Tailwind CSS classes:
- `bg-green-500`, `bg-red-500`, `bg-yellow-500`, `bg-blue-500` for toast colors
- `rounded-lg` for rounded corners
- `shadow-lg` for shadows
- `flex`, `gap-3` for layout
- `animate-fade-in`, `animate-slide-up` for animations

### Custom Animations

Added to `tailwind.config.js`:

```javascript
keyframes: {
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'slide-up': {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
}
```

### Mobile Responsiveness

- **Toast Position**: Automatically switches to top-center on mobile
- **Modal Width**: Uses `max-w-sm`, `max-w-md`, `max-w-lg` with padding
- **Touch Friendly**: Larger touch targets on mobile
- **Flexible Layout**: All components adapt to screen size

---

## Dependencies

- `lucide-react`: Icon library for Toast and Modal components
- `react`: Core React library (v19.2.0+)

Install lucide-react if not already installed:
```bash
npm install lucide-react@^0.408.0
```

---

## Error Handling

### Toast for Async Operations

```tsx
async function handleSave() {
  try {
    const { success, error } = useToast();
    await saveData();
    success('Data saved successfully!');
  } catch (err) {
    error('Failed to save data');
  }
}
```

### Modal with Error States

```tsx
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  try {
    setError(null);
    await submitForm();
    onClose();
  } catch (err) {
    setError(err.message);
  }
};

<Modal open={open} onClose={onClose} title="Form">
  {error && <div className="text-red-600 mb-4">{error}</div>}
  {/* Form content */}
</Modal>
```

---

## Accessibility Features

### Toast
- Icons provide visual context
- Text is always visible
- Close button for manual dismissal
- Color + icon combination (not just color)

### Modal
- Focus trap keeps focus within modal
- Escape key to close
- Semantic HTML with ARIA labels
- Backdrop click to close
- Focus restored to previous element on close

---

## Troubleshooting

### Toast not appearing
- Ensure `ToastContainer` is rendered in your component tree
- Check that `toasts` and `onDismiss` props are passed correctly

### Modal not showing
- Verify `open` prop is `true`
- Check `onClose` callback is properly defined
- Ensure modal is not hidden by parent overflow

---

## Examples

See `/src/components/` for complete component implementations and type definitions.
