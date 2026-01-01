# Exchange Completion Flow Modals

This directory contains the modal components for handling the exchange completion flow in BookSharePDX.

## Components

### 1. MarkAsGivenModal

**Purpose**: Initiates the exchange/gift completion process when a user marks their book as given.

**Props**:
- `open` (boolean): Whether the modal is open
- `onClose` (function): Callback when modal closes
- `post` (Post): The post being marked as given
- `currentUserId` (string): The current user's ID

**Flow**:
1. **Step 1**: Select recipient from users who messaged or commented on the post
   - Shows profile picture, username, distance, and last interaction time
   - Sorted by most recent interaction
   - If no interactions, shows empty state

2. **Step 2a** (Give Away posts): Confirm gift with stats preview
   - Shows what book is being given
   - Shows stats impact (+1 given for sender, +1 received for recipient)
   - Immediately archives post and updates stats on confirm

3. **Step 2b** (Exchange posts): Select book from recipient's active posts
   - Shows all recipient's available books with cover images
   - Checkbox: "I gave this away (no exchange)" for giving without exchange
   - **Edge Case**: If recipient has no available books, offers options:
     - Give away (no exchange)
     - Wait for recipient to post books
     - Select someone else

**Backend Actions**:
- **Exchange**: Sets both posts to `pending_exchange` status with `pendingExchange` data
- **Gift**: Archives post, updates both users' stats, creates system message
- Creates system message in the message thread

**System Messages**:
- Exchange: "Exchange proposed: Give [book], Receive [book]. [Recipient], please confirm."
- Gift: "Gift completed. [User] gave [book] to [recipient] as a gift."

---

### 2. ExchangeConfirmModal

**Purpose**: Allows the recipient to confirm or decline a pending exchange.

**Props**:
- `open` (boolean): Whether the modal is open
- `onClose` (function): Callback when modal closes
- `post` (Post): The recipient's post (receiving post) with pending exchange
- `currentUserId` (string): The current user's ID

**Views**:

1. **Confirm View** (default):
   - Shows the pending exchange details
   - Displays both books with cover images
   - "Confirm" button to accept the exchange
   - "Decline Exchange" button to reject

2. **Decline View**:
   - Radio buttons for decline reason:
     - This book is no longer available
     - I'd prefer a different book
     - Changed my mind about exchanging
     - Other (will send message)
   - Optional message textarea
   - On decline: Returns both posts to active, sends system message

3. **Book No Longer Available** (edge case):
   - Detected when recipient's book status is not `pending_exchange`
   - Options:
     - **Offer a different book**: Select from recipient's other active posts
     - **Accept as a gift**: No exchange, just accept the book
     - **Cancel this transaction**: Decline the exchange
   - If offering different book: Creates new pending exchange with alternative book

**Backend Actions**:
- **Confirm**: Archives both posts, updates both users' stats (+1 given, +1 received each)
- **Decline**: Returns both posts to active, removes pending exchange
- **Offer Different**: Cancels current exchange, creates new pending exchange
- **Accept as Gift**: Archives giving post only, updates stats accordingly

**System Messages**:
- Confirmed: "Exchange Completed. [User1] gave [book1], [User2] gave [book2]. Both books marked as exchanged!"
- Declined: "Exchange Declined. [User] declined the exchange for [book]. Reason: [reason]"
- Offered Different: "Exchange Updated. [User]'s [book1] is no longer available. [User] is offering [book2] instead."
- Accepted as Gift: "Gift Completed. [User1] gave [book] to [User2] as a gift."

---

### 3. ExchangeCancelModal

**Purpose**: Allows the exchange initiator to cancel a pending exchange before the recipient confirms.

**Props**:
- `open` (boolean): Whether the modal is open
- `onClose` (function): Callback when modal closes
- `post` (Post): The post with pending exchange
- `currentUserId` (string): The current user's ID

**Flow**:
- Shows confirmation message
- Explains that post will return to active
- On confirm: Returns both posts to active status, sends system message

**Backend Actions**:
- Returns both posts to `active` status
- Removes `pendingExchange` data from both posts
- Creates system message in thread

**System Message**:
- "Exchange Cancelled. [User] cancelled the pending exchange."

---

## Usage Examples

### Using MarkAsGivenModal

```tsx
import { MarkAsGivenModal } from './components/exchange';
import { useState } from 'react';

function PostCard({ post, currentUserId }) {
  const [showMarkAsGiven, setShowMarkAsGiven] = useState(false);

  return (
    <>
      <button onClick={() => setShowMarkAsGiven(true)}>
        Mark as Given
      </button>

      <MarkAsGivenModal
        open={showMarkAsGiven}
        onClose={() => setShowMarkAsGiven(false)}
        post={post}
        currentUserId={currentUserId}
      />
    </>
  );
}
```

### Using ExchangeConfirmModal

```tsx
import { ExchangeConfirmModal } from './components/exchange';
import { useState } from 'react';

function PendingExchangeBanner({ post, currentUserId }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (post.status !== 'pending_exchange') return null;

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 p-4">
        <p>Pending Exchange</p>
        <button onClick={() => setShowConfirm(true)}>
          Confirm Exchange
        </button>
      </div>

      <ExchangeConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        post={post}
        currentUserId={currentUserId}
      />
    </>
  );
}
```

### Using ExchangeCancelModal

```tsx
import { ExchangeCancelModal } from './components/exchange';
import { useState } from 'react';

function PendingExchangeStatus({ post, currentUserId }) {
  const [showCancel, setShowCancel] = useState(false);

  if (post.status !== 'pending_exchange') return null;

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 p-4">
        <p>Waiting for recipient to confirm</p>
        <button onClick={() => setShowCancel(true)}>
          Cancel Exchange
        </button>
      </div>

      <ExchangeCancelModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        post={post}
        currentUserId={currentUserId}
      />
    </>
  );
}
```

---

## Edge Cases Handled

### 1. No Interactions
- **Scenario**: User tries to mark as given but no one has messaged or commented
- **Handling**: Shows empty state with message about marking as given outside the app

### 2. Recipient Has No Available Books
- **Scenario**: Exchange post but recipient has no active posts
- **Handling**: Shows options to give away without exchange or wait/select someone else

### 3. Giving Away Exchange Post Without Exchange
- **Scenario**: Exchange post but user checks "I gave this away (no exchange)"
- **Handling**: Shows confirmation modal explaining this is a gift, not an exchange

### 4. Selected Book No Longer Available
- **Scenario**: Initiator selected a book, but recipient already gave it away before confirming
- **Handling**: Shows alternative options modal with ability to offer different book, accept as gift, or cancel

### 5. Multiple Interactions from Same User
- **Scenario**: User both messaged and commented on the post
- **Handling**: Shows only one entry for the user, with most recent interaction type and time

---

## Data Flow

### Post Status States
- `active`: Post is available for exchange/giveaway
- `pending_exchange`: Post is part of a pending exchange, waiting for confirmation
- `archived`: Post has been given away/exchanged

### PendingExchange Object
```typescript
{
  initiatorUserId: string;      // User who initiated the exchange
  recipientUserId: string;       // User who will confirm/decline
  givingPostId: string;          // Post being given by initiator
  receivingPostId: string;       // Post being given by recipient
  timestamp: number;             // When exchange was proposed
}
```

### System Message Types
- `exchange_proposed`: Exchange has been initiated
- `exchange_completed`: Both parties confirmed, exchange complete
- `exchange_declined`: Recipient declined the exchange
- `exchange_cancelled`: Initiator cancelled the exchange
- `gift_completed`: Gift (no exchange) completed

---

## Styling

All modals use Tailwind CSS classes and follow the BookSharePDX design system:
- **Primary color**: Green (#059669 / green-600)
- **Border radius**: 8px (rounded-lg)
- **Spacing**: Consistent 4px unit spacing
- **Transitions**: 200ms ease for all hover states
- **Disabled states**: Gray background with reduced opacity

---

## Dependencies

- React 18+
- `@booksharepdx/shared` types package
- `Modal` component from `../Modal`
- `useToast` hook from `../useToast`
- Data services: `postService`, `userService`, `messageService`, `commentService`

---

## Testing Considerations

When testing these modals, ensure:
1. User can navigate through all steps
2. Error states are handled gracefully
3. Loading states prevent double submissions
4. Modal closes properly on success/cancel
5. System messages are created correctly
6. Stats are updated accurately
7. Edge cases display appropriate UI
8. Keyboard navigation (Tab, Escape) works
9. Screen readers can navigate the content
10. Toast notifications appear on success/error
