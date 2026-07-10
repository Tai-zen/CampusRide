# Security Specification for CampusRide Firestore Rules

This security specification defines the data invariants, vulnerability testing scenarios, and test suite layout to protect the CampusRide ecosystem against unauthorized operations.

## 1. Data Invariants

1. **User Identity Isolation**: A user's profile, notifications subcollection, and transactions subcollection under `/users/{userId}` are strictly owner-accessible. Nobody else can read or write to them, except admins.
2. **Privilege Integrity**: Standard users cannot self-assign roles or overwrite the `role` field to elevate privileges (e.g. changing role to `admin` or approving themselves as a driver).
3. **Ride Claiming Ownership**: A ride request can only be created by its passenger, and can only be claimed (`status` updated to `accepted`) by an approved driver.
4. **Transaction Integrity**: Users cannot manually modify historical transactions or insert fake top-up transactions without valid validation.
5. **Admin Access Control**: Sensitive actions (like viewing and managing pending driver applications under `/pendingDrivers`) require a verified administrative identity.

---

## 2. The "Dirty Dozen" Payloads (Security Red Team Cases)

Below are twelve malicious payloads/queries designed to breach system security:

### Payload 1: Privilege Escalation
An attacker attempts to create a user profile with role `admin` or modify their own `role` field to bypass security checks.
```json
{
  "id": "malicious-user-123",
  "name": "Attacker",
  "email": "attacker@campus.edu",
  "role": "admin"
}
```

### Payload 2: Profile Hijacking
User `A` tries to overwrite User `B`'s profile data.
```json
{
  "id": "victim-user-456",
  "name": "Victim Name",
  "walletBalance": 0
}
```

### Payload 3: Direct Balance Injection
A student attempts to set their `walletBalance` directly to a large value without submitting a valid transaction.
```json
{
  "walletBalance": 999999
}
```

### Payload 4: Fake Driver Self-Approval
A driver registration attempts to set `isApproved` or write to `pendingDrivers` directly to force activation.
```json
{
  "id": "driver-abc",
  "isApproved": true
}
```

### Payload 5: Siphoning Private Notifications
User `A` attempts to read user `B`'s inbox (`/users/victim-user-456/notifications/notif-789`).
```json
"GET /users/victim-user-456/notifications/notif-789"
```

### Payload 6: Forging Transaction Logs
An attacker attempts to insert a fake `reload` transaction directly into their transaction history without actually transferring funds.
```json
{
  "id": "fake-reload-999",
  "amount": 5000,
  "type": "reload",
  "status": "Completed",
  "description": "Admin approved ₦5000 reload"
}
```

### Payload 7: Ride Request Hijack
User `B` tries to claim/delete a ride requested by User `A` when they are not the designated driver.
```json
{
  "driverId": "malicious-driver-uid",
  "status": "accepted"
}
```

### Payload 8: Excessive Size Injection (Denial of Wallet)
An attacker tries to send a massive string to the `name` field to consume Firestore storage.
```json
{
  "name": "[10,000 character string of junk]"
}
```

### Payload 9: Invalid String Characters in Document ID
An attacker tries to use an SQL injection or special character string as a document ID.
```json
"doc-id": "../users/victim"
```

### Payload 10: Anonymous Read of All Rides
An unauthenticated or anonymous user attempts to list the `/rideRequests` collection.
```json
"LIST /rideRequests"
```

### Payload 11: Future Timestamp Manipulation
A client attempts to bypass temporal constraints by sending a future timestamp instead of a server timestamp.
```json
{
  "createdAt": 1924905600000
}
```

### Payload 12: Admin Application Overwrite
An unapproved driver tries to delete or approve driver listings under `/pendingDrivers`.
```json
"DELETE /pendingDrivers/driver-abc"
```

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

A test runner would configure the Firebase Rules Unit Testing SDK to mock standard authentication tokens and verify that each of the "Dirty Dozen" cases results in `PERMISSION_DENIED`.

```typescript
// Sample structure of firestore.rules.test.ts using @firebase/rules-unit-testing
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gen-lang-client-0496229395',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    }
  });
});

test('Riders cannot edit other riders profiles', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  const bobProfile = aliceDb.doc('users/bob');
  await expect(bobProfile.set({ name: 'Bob Modified' })).rejects.toThrow();
});
```
