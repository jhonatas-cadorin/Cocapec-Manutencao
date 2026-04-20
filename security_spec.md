# Security Specification - Cocapec Manutenção

## Data Invariants
1. **User Identity**: Every user document must be owned by the authenticated user (`uid == request.auth.uid`).
2. **Role Integrity**: Only `Jhonatas.Cadorin@gmail.com` can self-assign the 'admin' role. All others start as 'user'.
3. **Ticket Ownership**: A ticket requester cannot change the ticket's `assignedToId` or `status` (except to cancel).
4. **Staff Authority**: Only 'admin', 'leader', or 'tech' roles can modify ticket execution states.
5. **Asset/Environment Protection**: Only staff can create or modify environments, fixed assets, or inventory.
6. **Immutability**: `createdAt` and `requesterId` must never change after creation.
7. **Strict Schema**: No "shadow fields" allowed; all documents must match defined properties and types.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to create a user profile with a different `uid`.
2. **Privilege Escalation**: Non-owner attempting to set their role to 'admin' during registration.
3. **Ghost Update**: Attempting to add an `isVerified: true` field to a ticket.
4. **Orphaned Ticket**: Creating a ticket with a non-existent `environmentId` (checked via `exists()`).
5. **Status Bypass**: Directly setting a ticket to 'completed' without being a staff member.
6. **Terminal Edit**: Attempting to edit a 'cancelled' or 'completed' ticket.
7. **ID Poisoning**: Using a 2KB string as a document ID to exhaust resources.
8. **PII Breach**: A regular user attempting to `get` another user's profile which contains an email.
9. **Timestamp Fraud**: Providing a client-side `createdAt` that doesn't match `request.time`.
10. **Blanket Query**: Attempting to list the entire `users` collection as a non-admin.
11. **Negative Inventory**: Setting inventory `quantity` to -50.
12. **Role Theft**: A user trying to change their own role after creation.

## Rules Test Plan
- Verify `users` read is blocked for non-owners (PII isolation).
- Verify `tickets` update keys are strictly enforced (`affectedKeys().hasOnly()`).
- Verify `isValidTicket()` checks types and sizes.
