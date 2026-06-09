# Security Specification: Shared Catalog & Core Store Rules

This security specification implements attribute-based zero-trust security control protocols for the Capitano Storefront Firebase backend.

## 1. Data Invariants
1. **Catalog Integrity**: Any item created or updated in the `/products` collection must have a non-empty name, a valid category (one of `boots`, `jersey`, `gloves`, `football`, `access`, `pants`), and a real numeric price greater than zero.
2. **Settings Invariant**: The database holds a single configuration document `/settings/general` specifying the WhatsApp destination.
3. **Role-Based Access Control (RBAC)**: All read operations (`get`, `list`) for `products` and `settings` are publicly available to all users (both authenticated and unauthenticated guests) to enable instant browse/shopping. All write operations (`create`, `update`, `delete`) are strictly gated and restricted to the bootstrapped administrator (`pdey4931@gmail.com`).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious payloads must be rejected by the security rules:

1. **Anonymous Product Upload**: An unauthenticated request attempting to create a product.
   - *Result*: `PERMISSION_DENIED`
2. **Fake Admin Spoofing**: An authenticated user with email `attacker@gmail.com` trying to write a product.
   - *Result*: `PERMISSION_DENIED`
3. **Zero Price Exploit**: Writing a product with a `price: -100` or `price: 0`.
   - *Result*: `PERMISSION_DENIED`
4. **Empty Name Product**: Uploading a product without a `name` attribute.
   - *Result*: `PERMISSION_DENIED`
5. **Junk ID Poisoning**: Trying to create a product document with a huge 2KB size junk ID string (e.g. `projectId` or `productId` containing malicious symbols).
   - *Result*: `PERMISSION_DENIED`
6. **Malicious Override of Store Settings**: Trying to modify the official store WhatsApp redirect link or store name.
   - *Result*: `PERMISSION_DENIED`
7. **Identity Theft / Privilege Escalation**: A normal user trying to promote themselves by setting an custom database claim or modifying administrative metadata.
   - *Result*: `PERMISSION_DENIED`
8. **Invalid Category Trick**: Creating a product with the category set to `malware_injector_cat`.
   - *Result*: `PERMISSION_DENIED`
9. **Discount Fraud**: Setting an invalid discount percentage `disc: 999` or `disc: -50`.
   - *Result*: `PERMISSION_DENIED`
10. **Unsafe String Overloading**: Writing a description field exceeding 2000 characters to exploit billing.
    - *Result*: `PERMISSION_DENIED`
11. **Immortal Field Override**: Trying to modify the `createdAt` timestamp during subsequent edits.
    - *Result*: `PERMISSION_DENIED`
12. **Settings Reset Attacker**: An unauthenticated guest trying to delete the `/settings/general` document so that orders cannot go through.
    - *Result*: `PERMISSION_DENIED`

---

## 3. Security Rules Draft (firestore.rules)
Security rules will be deployed via the `deploy_firebase` tool and enforce these invariants mathematically.
