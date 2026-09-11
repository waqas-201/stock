# Firestore Security Specification

## 1. Data Invariants
1. **User Scoping & Identity**: Every document in `stock_items`, `stock_units`, `audit_logs`, and `user_settings` must belong to the authenticated user (`userId == request.auth.uid`). A user can never read, list, create, edit, or delete another user's inventory items or records.
2. **Id Sanitization**: Document path parameters (`itemId`, `unitId`, `logId`, `userId`) must be alphanumeric identifiers without malicious symbols and must be under 128 characters.
3. **Item Immutability**: The `id`, `createdAt`, and `userId` fields cannot be altered or spoofed after creation.
4. **Volume & Size Bounds**:
   - `itemName`: String, 1 to 200 characters.
   - `unit`: String, 1 to 50 characters.
   - `quantity`: Number >= 0.
   - `lowStockThreshold`: Number >= 0.
   - `productionDate`: String <= 30 characters (or empty).
   - `notes`: String <= 2000 characters (or empty).
   - `summary`: String <= 200 characters.
   - `details`: String <= 2000 characters.
5. **No Client Query Trust**: Rules must reject `list` operations unless `resource.data.userId == request.auth.uid`.

## 2. The Dirty Dozen Attack Payloads
1. **Spoofed User ID on Create**: Attacker tries to write an item with `userId: 'victim_123'` while authenticated as `attacker_456`. (Must return PERMISSION_DENIED).
2. **Unauthenticated Read/Write**: Anonymous/unauthenticated client attempts to read `/stock_items` without sign-in. (Must return PERMISSION_DENIED).
3. **ID Injection Attack**: Client uses a 5KB junk string or path traversal `../../admin` as document ID. (Must return PERMISSION_DENIED).
4. **Negative Quantity Poisoning**: Client attempts to set stock quantity to `-9999`. (Must return PERMISSION_DENIED).
5. **Denial of Wallet Giant String**: Client submits a 500KB string for `itemName` or `notes`. (Must return PERMISSION_DENIED).
6. **Cross-User Snooping (List)**: User A tries to list items without constraining to their own `userId`. (Must return PERMISSION_DENIED).
7. **Cross-User Delete**: User A tries to delete User B's stock item document. (Must return PERMISSION_DENIED).
8. **Shadow Field Injection**: Client attempts to insert unknown administrative fields like `isAdmin: true` into `stock_items`. (Must return PERMISSION_DENIED).
9. **Immutable Field Tampering**: Client attempts to change `userId` or `createdAt` during an update. (Must return PERMISSION_DENIED).
10. **Unit Tampering on Foreign User**: User A attempts to delete or overwrite User B's measurement unit. (Must return PERMISSION_DENIED).
11. **Log Forgery for Foreign User**: User A attempts to inject audit logs into User B's audit stream. (Must return PERMISSION_DENIED).
12. **Settings Hijacking**: User A attempts to overwrite User B's `user_settings` document. (Must return PERMISSION_DENIED).
