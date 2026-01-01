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

### 3. BlockReportMenu Component

A three-dot menu for blocking and reporting users with full integration.

#### File
- `BlockReportMenu.tsx`

#### Features
- **Block/Unblock**: Toggle user block status with immediate feedback
- **Report User**: Opens report modal with pre-filled user data
- **Click Outside**: Menu closes when clicking outside
- **Toast Feedback**: Success/error notifications
- **Block Confirmation**: Offers to block user after report submission

#### Usage

```tsx
import { BlockReportMenu } from '@/components';
import { useUser } from '@/contexts/UserContext';

function UserProfile() {
  const { currentUser } = useUser();
  const targetUserId = 'user-123';
  const targetPostId = 'post-456'; // Optional

  if (!currentUser) return null;

  return (
    <div>
      <h1>User Profile</h1>
      <BlockReportMenu
        targetUserId={targetUserId}
        targetPostId={targetPostId}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
```

#### Props

```typescript
interface BlockReportMenuProps {
  targetUserId: string;      // User to block/report
  targetPostId?: string;     // Optional: associated post ID
  currentUserId: string;     // Current user ID (the one doing the action)
}
```

#### Behavior
1. **Block User**
   - Toggles block status
   - Shows success toast with status change
   - Disables messaging between users

2. **Report User**
   - Opens ReportModal with pre-filled targetUserId
   - After submission, offers "Block this user too?" confirmation
   - Creates report with all details in database

---

### 4. ReportModal Component

A comprehensive form for reporting users with multiple reason options and details capture.

#### File
- `ReportModal.tsx`

#### Features
- **Multiple Reasons**: Spam, Harassment, Scam, Inappropriate, Other
- **Details Textarea**: Optional context for the report
- **Message History**: Checkbox to include conversation history (if applicable)
- **Form Validation**: Ensures at least one reason is selected
- **Loading State**: Button shows "Submitting..." while processing
- **Block Confirmation**: Offers to block user after successful report
- **Auto-dismiss**: Closes automatically after successful submission

#### Usage

```tsx
import { ReportModal } from '@/components';
import { reportService } from '@/services/dataService';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (
    reasons: string[],
    details?: string,
    includeMessageHistory?: boolean
  ) => {
    await reportService.create({
      reporterId: 'current-user-id',
      reportedUserId: 'target-user-id',
      reasons: reasons as any,
      details,
      includeMessageHistory,
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>Report User</button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        targetUserId="user-123"
        targetPostId="post-456" // Optional
        onSubmit={handleSubmit}
        isFromConversation={true}
      />
    </>
  );
}
```

#### Props

```typescript
interface ReportModalProps {
  open: boolean;                                    // Modal visibility
  onClose: () => void;                             // Close callback
  targetUserId: string;                            // User being reported
  targetPostId?: string;                           // Optional associated post
  onSubmit: (
    reasons: string[],
    details?: string,
    includeMessageHistory?: boolean
  ) => void | Promise<void>;                       // Submit handler
  isFromConversation?: boolean;                    // Show message history option
}
```

#### Report Reasons
- **Spam**: Unwanted promotional or duplicate content
- **Harassment**: Threatening or harassing behavior
- **Scam**: Fraudulent or deceptive activity
- **Inappropriate**: Offensive or inappropriate content
- **Other**: Any other reason (requires details)

#### Form States
- **Empty**: At least one reason required
- **Submitting**: Button disabled, shows loading state
- **Success**: Shows block confirmation modal
- **Error**: Toast notification with error message

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

### Using BlockReportMenu in Pages

Example: Profile page with block/report menu

```tsx
import { BlockReportMenu } from '@/components';
import { useUser } from '@/contexts/UserContext';

function ProfilePage() {
  const { currentUser } = useUser();
  const { user: profileUser } = useProfileData(); // Your hook

  if (!currentUser || !profileUser) return null;

  const isOwnProfile = currentUser.id === profileUser.id;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{profileUser.username}</h1>
          <p className="text-gray-600">{profileUser.bio}</p>
        </div>

        {!isOwnProfile && (
          <BlockReportMenu
            targetUserId={profileUser.id}
            currentUserId={currentUser.id}
          />
        )}
      </div>

      {/* Rest of profile content */}
    </div>
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

### BlockReportMenu
- Semantic button elements
- ARIA labels for actions
- Keyboard accessible
- Click outside to close

### ReportModal
- Label associations with form inputs
- Required field indicators
- Semantic form structure
- Error messages for validation

---

## Troubleshooting

### Toast not appearing
- Ensure `ToastContainer` is rendered in your component tree
- Check that `toasts` and `onDismiss` props are passed correctly

### Modal not showing
- Verify `open` prop is `true`
- Check `onClose` callback is properly defined
- Ensure modal is not hidden by parent overflow

### BlockReportMenu menu not closing
- Verify click outside handler is working
- Check z-index conflicts with other elements

### Report submission failing
- Confirm `reportService` is imported correctly
- Check that all required fields are filled
- Verify user IDs are valid

---

## Examples

See `/src/components/` for complete component implementations and type definitions.
