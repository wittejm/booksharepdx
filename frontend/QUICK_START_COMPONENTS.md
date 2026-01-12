# Quick Start Guide - Shared UI Components

## Installation

### Step 1: Install lucide-react
```bash
npm install
```

The package.json has already been updated with `lucide-react@^0.408.0`.

### Step 2: Update Tailwind Config
The `tailwind.config.js` has already been updated with required animations.

## Basic Setup

### Step 3: Add Toast to App.tsx

```tsx
import { useToast, ToastContainer } from './components';

function App() {
  const { toasts, dismiss } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Your app content */}
    </>
  );
}
```

## Component Quick Reference

### 1. Toast (Notifications)

```tsx
import { useToast, ToastContainer } from './components';

function MyComponent() {
  const { toasts, success, error, warning, info, dismiss } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <button onClick={() => success('Saved!')}>Save</button>
      <button onClick={() => error('Failed!')}>Error</button>
      <button onClick={() => warning('Be careful!')}>Warning</button>
      <button onClick={() => info('FYI')}>Info</button>
    </>
  );
}
```

**Toast Options:**
- `success(message, duration?)` - Green toast
- `error(message, duration?)` - Red toast
- `warning(message, duration?)` - Yellow toast
- `info(message, duration?)` - Blue toast
- Default duration: 3000ms

---

### 2. Modal (Dialogs)

```tsx
import { Modal } from './components';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="My Modal"
        size="md"
      >
        <p>Your content here</p>
        <button onClick={() => setOpen(false)}>Close</button>
      </Modal>
    </>
  );
}
```

**Modal Sizes:**
- `sm` - Small (max-width: 24rem)
- `md` - Medium (max-width: 28rem) - Default
- `lg` - Large (max-width: 32rem)

**Modal Features:**
- Close with Esc key
- Close by clicking outside
- Close button (X) in header
- Accessible focus management

---

### 3. BlockReportMenu (User Actions)

```tsx
import { BlockReportMenu } from './components';
import { useUser } from './contexts/UserContext';

function ProfilePage() {
  const { currentUser } = useUser();

  return (
    <>
      <h1>User Profile</h1>

      <BlockReportMenu
        targetUserId="user-id-to-block-or-report"
        currentUserId={currentUser?.id || ''}
        targetPostId="optional-post-id"
      />
    </>
  );
}
```

**Menu Actions:**
- Block/Unblock user
- Report user (opens ReportModal)

---

### 4. ReportModal (Report Form)

Automatically integrated with BlockReportMenu. For standalone use:

```tsx
import { ReportModal } from './components';
import { reportService } from './services';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (reasons, details, includeHistory) => {
    await reportService.create({
      reporterId: 'your-user-id',
      reportedUserId: 'reported-user-id',
      reasons,
      details,
      includeMessageHistory: includeHistory,
    });
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>Report</button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        targetUserId="user-to-report"
        onSubmit={handleSubmit}
        isFromConversation={true}
      />
    </>
  );
}
```

**Report Reasons:**
- Spam
- Harassment
- Scam
- Inappropriate Content
- Other

---

## Common Patterns

### Pattern 1: Success Message After Action

```tsx
const { success, error } = useToast();

async function handleDelete() {
  try {
    await deleteItem(id);
    success('Item deleted!');
  } catch (err) {
    error('Failed to delete');
  }
}
```

### Pattern 2: Modal with Form

```tsx
const [open, setOpen] = useState(false);
const { success, error } = useToast();

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await submitForm();
    success('Form submitted!');
    setOpen(false);
  } catch (err) {
    error('Submission failed');
  }
};

return (
  <>
    <button onClick={() => setOpen(true)}>Open Form</button>

    <Modal open={open} onClose={() => setOpen(false)} title="My Form">
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="submit">Submit</button>
      </form>
    </Modal>
  </>
);
```

### Pattern 3: Block/Report on Profile

```tsx
function ProfilePage({ userId }) {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1>User Profile</h1>
      </div>

      {currentUser.id !== userId && (
        <BlockReportMenu
          targetUserId={userId}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
}
```

---

## File Locations

All components are in `/src/components/`:

```
/src/components/
├── Toast.tsx                   # Individual toast
├── useToast.tsx               # Toast hook
├── ToastContainer.tsx         # Toast container
├── Modal.tsx                  # Modal dialog
├── BlockReportMenu.tsx        # Block/report menu
├── ReportModal.tsx            # Report form
├── index.ts                   # Exports
└── COMPONENT_USAGE.md         # Full documentation
```

## Import Examples

```tsx
// Individual imports
import Toast from '@/components/Toast';
import { useToast } from '@/components/useToast';
import ToastContainer from '@/components/ToastContainer';
import Modal from '@/components/Modal';
import BlockReportMenu from '@/components/BlockReportMenu';
import ReportModal from '@/components/ReportModal';

// Or from index
import {
  Toast,
  ToastContainer,
  useToast,
  Modal,
  BlockReportMenu,
  ReportModal
} from '@/components';
```

---

## Styling

All components use Tailwind CSS. Customize by:

1. **Colors**: Change Tailwind color classes in component files
2. **Sizes**: Add new sizes to Modal (sm, md, lg, xl)
3. **Animations**: Adjust timings in `tailwind.config.js`
4. **Spacing**: Modify padding/margin classes

Example: Change toast duration
```tsx
success('Message', 5000); // 5 seconds instead of 3
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Toast not showing | Ensure `ToastContainer` is in render tree |
| Modal not closing | Check `onClose` callback is working |
| Menu not closing | Verify click-outside handler |
| Icons missing | Ensure `lucide-react` is installed |
| Styling issues | Check Tailwind is properly configured |

---

## Next Steps

1. Add Toast to App.tsx
2. Use in your pages/components
3. Read `COMPONENT_USAGE.md` for detailed examples
4. Customize styling as needed

---

## Documentation

- **SHARED_COMPONENTS_SUMMARY.md** - Full build overview
- **COMPONENT_USAGE.md** - Detailed component documentation
- **QUICK_START_COMPONENTS.md** - This file

---

**Ready to use!** All components are production-ready with TypeScript support, Tailwind styling, and mobile responsiveness.
