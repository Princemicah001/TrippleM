# Firestore Security Specification & Vulnerability Test Cases

This documentation details the safety invariants, potential vulnerabilty testing vectors ("Dirty Dozen" payloads), and rules test runner configurations.

## 1. Data Invariants

* **Identity Coupling**: Any read or write operation requires the user to be fully authenticated. Anonymous authenticated users serve as clerks.
* **Administrative Override**: Full access bypasses structural schema validations for registered owners matching specified high-level authorization profiles (e.g., matching known admin emails or specified administrative UIDs like `admin`).
* **Relational Integrity**:
  - A product cannot exist without referencing a valid business entity (`bizId`).
  - Cashier personnel profiles cannot be added or deleted without an associated business (`bizId`).
  - Transactions must reference a valid business branch (`bizId`) and terminal register operator (`userId`).

---

## 2. The "Dirty Dozen" Payload Safeguards

The following malicious payload scenarios must be mathematically blocked and rejected by the firestore rules engine:

1. **Unauthenticated Business Seeding**: Creating a business/shop branch without sign-in credentials.
2. **Path Injection / ID Spoofing**: Injecting an oversized string block (e.g., >128 length) as a document path ID.
3. **Ghost Status Promotion**: Setting a branch status to an invalid state.
4. **Product Price Value Injection**: Creating inventory items with a non-numeric price point.
5. **Team Size Overload**: Bypassing structure constraints on clerical listings.
6. **Self-Assigned Administrative Elevation**: Creating a team member profile with unverified operational permissions.
7. **Orphan transactions**: Logging cash register sales without a business reference.
8. **Malicious Negative Account Inflow**: Submitting manual negative amount parameters on ledger records.
9. **Tampering Audit Stream Trails**: Appending malicious, unauthenticated warnings into the operational logs database.
10. **Spoofing Email Auth**: Supplying unverified owner emails attempting to override verification flags.
11. **Altering Immutable Creation Signatures**: Re-submitting updates modifying structural properties.
12. **System Log Injection**: Overwriting existing database audit history entries with malicious logs payload.

---

## 3. Test Runner Blueprint (`firestore.rules.test.ts`)

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "tripplem-43fe8",
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('Deletes or invalid fields should block writes', async () => {
  const alice = testEnv.authenticatedContext('alice');
  const db = alice.firestore();
  
  // Attempt unauthorized insert on businesses
  const maliciousRef = doc(db, 'businesses', 'invalid_id_$$$');
  await expect(setDoc(maliciousRef, { name: 'Fake Shop' })).rejects.toThrow();
});
```
