# Full Stabilization Plan: UX, Backend Wiring, Auth, and Advanced Split Groups

## Summary
Implement one full pass that replaces mock-driven behavior with real backend-backed workflows, introduces complete account creation/login protection, and adds the unfinished split feature as an advanced module. Every visible button must have a deterministic, meaningful action.  
Target outcome: a production-ready MVP where dashboard pages, settings, and split groups are fully functional and consistent.

## 1. Locked Decisions
1. Scope: **Full Feature Pass**.
2. Auth UX: **Email/password basic** (name + email + password).
3. Button policy: **Functional MVP for every visible button** (no dead clicks).
4. Split module depth: **Advanced Split**.
5. Split members: **Hybrid** (registered users + guest members).
6. Invites: **Invite code + passcode** join flow.
7. Currency: **Per-group currency** (no conversion).
8. Reports/AI: **Data-derived summaries** (no LLM calls).
9. New-user experience: **Empty state + guided setup** (no auto-seeded demo data).

## 2. Success Criteria
1. All dashboard pages load real user data from APIs; no `MOCK_*` usage in page runtime paths.
2. Unauthenticated users are redirected to auth pages; authenticated users are redirected away from auth pages.
3. Split groups support create/join/invite/member management/expense split/settlement/activity.
4. Every current button in UI triggers a real action (navigation, modal workflow, API mutation, or state control).
5. Lint/build pass with no errors; core flows validated by automated + scenario tests.

## 3. Public API, Interface, and Type Changes

### 3.1 Auth/User APIs
1. `POST /api/auth/register` (existing): add strict `zod` validation and normalized errors.
2. `POST /api/auth/login` (existing): add strict validation and normalized errors.
3. `POST /api/auth/logout` (new): clear auth cookie.
4. `GET /api/auth/me` (new): return current user + preferences.
5. `PUT /api/users/me` (new): update profile fields and settings.
6. `DELETE /api/users/me/data` (new): wipe user-owned domain data.
7. `DELETE /api/users/me` (new): delete account and related records.

### 3.2 Budgets APIs
1. `GET /api/budgets?month=YYYY-MM` (new): return monthly category budgets with computed spend/remaining.
2. `POST /api/budgets` (new): create/update monthly budget for category.
3. `PUT /api/budgets/[id]` (new): update limit/category.
4. `DELETE /api/budgets/[id]` (new): delete budget entry.

### 3.3 Transactions/Subscriptions APIs
1. Keep existing CRUD/export routes.
2. Add `zod` input validation, typed response envelopes, and consistent error payload shape.
3. Ensure pagination/filter responses are stable and consumed by UI.

### 3.4 Reports APIs
1. `GET /api/reports/summary?month=YYYY-MM` (new): deterministic computed insights.
2. `GET /api/reports/ai-summary` (existing): return same computed summary contract for compatibility (internally mapped to summary service).

### 3.5 Split APIs (new namespace: `/api/split`)
1. `GET /api/split/groups`
2. `POST /api/split/groups`
3. `GET /api/split/groups/[groupId]`
4. `PATCH /api/split/groups/[groupId]`
5. `DELETE /api/split/groups/[groupId]`
6. `POST /api/split/groups/join` (requires `inviteCode` + `passcode`)
7. `GET /api/split/groups/[groupId]/members`
8. `POST /api/split/groups/[groupId]/members`
9. `PATCH /api/split/groups/[groupId]/members/[memberId]`
10. `DELETE /api/split/groups/[groupId]/members/[memberId]`
11. `POST /api/split/groups/[groupId]/invite/regenerate` (rotates code and passcode)
12. `GET /api/split/groups/[groupId]/expenses`
13. `POST /api/split/groups/[groupId]/expenses`
14. `PATCH /api/split/groups/[groupId]/expenses/[expenseId]`
15. `DELETE /api/split/groups/[groupId]/expenses/[expenseId]`
16. `GET /api/split/groups/[groupId]/settlements`
17. `POST /api/split/groups/[groupId]/settlements`
18. `GET /api/split/groups/[groupId]/activity`
19. `GET /api/split/groups/[groupId]/balances`

### 3.6 New/Updated Types and Models
1. `User` add `settings.notifications` object and optional profile metadata.
2. `Budget` model: `userId`, `category`, `month`, `limit`, timestamps, unique index `(userId, category, month)`.
3. `SplitGroup` model: owner, name, description, currency, inviteCode, passcodeHash, status.
4. `SplitMember` model: `groupId`, `userId?`, `guestName?`, `email?`, role, status.
5. `SplitExpense` model: paidBy, amount, currency, splitType (`equal|custom`), split shares.
6. `SplitSettlement` model: payer/receiver/amount/currency/date.
7. `SplitActivity` model: normalized event log for group timeline.
8. Frontend type modules for each API response/request contract.

## 4. Frontend Plan (Pages, Routing, and Wiring)

### 4.1 Route Structure
1. Add `(auth)` route group with `/login` and `/register`.
2. Keep dashboard routes under protected group.
3. Add split pages:
   - `/split` group list and join/create flows.
   - `/split/[groupId]` with tabs: Overview, Expenses, Members, Activity, Settlements.

### 4.2 Auth and Protection
1. Add middleware for route protection and redirect logic.
2. Add session bootstrap in app shell (`/api/auth/me`) for user context.
3. Implement logout action in sidebar button.

### 4.3 Data Wiring
1. Replace dashboard page imports from mock data with API hooks/services.
2. Transactions page: server pagination, filter sync, create/edit/delete wiring.
3. Subscriptions page: create/edit/status changes/delete wiring + timeline month controls.
4. Budgets page: real CRUD and computed progress from expenses.
5. Reports page: call summary endpoint and render computed insights/charts.
6. Settings page: profile save, notification preference persistence, destructive action confirmations.
7. Notification bell: open panel of derived alerts (budget thresholds + upcoming subscription dues).

### 4.4 UI Consistency
1. Standardize interaction patterns for all pages:
   - Loading state per card/table/modal.
   - Error state banner with retry.
   - Empty state with primary CTA.
   - Confirm dialogs for destructive actions.
2. Introduce shared UI primitives:
   - `Modal`, `ConfirmDialog`, `EmptyState`, `ActionMenu`, `Toast`, `FilterBar`.

## 5. Button Interaction Contract (Current UI)
1. Sidebar logout: calls `POST /api/auth/logout`, then redirect `/login`.
2. Header notification bell: toggles notification panel.
3. Dashboard:
   - `View All Goals` -> navigate `/budgets`.
   - `Download Statement` -> call `/api/transactions/export`.
4. Transactions:
   - Export/filter/search/pagination/row menu all wired.
   - Add modal submits to `POST /api/transactions`.
   - Type toggle actually changes payload `type`.
5. Subscriptions:
   - Filter/sort/month chevrons wired to data query state.
   - Card menu supports edit/pause/cancel/delete.
   - Add modal submits to `POST /api/subscriptions`.
6. Budgets:
   - `Set Budget` opens create/update modal and persists via budgets API.
7. Settings:
   - `Save Changes` persists profile.
   - Notification toggles persist preferences.
   - `Delete All Data` and `Delete Account` execute confirmed API mutations.

## 6. Data Flow and Edge Cases
1. Unauthorized API responses (`401`) trigger client redirect to `/login`.
2. Validation errors (`400/422`) map to field-level form messages.
3. Split invite rotation invalidates old code/passcode immediately.
4. Guest member claimed by account: merge by matching email on join.
5. Settlement > outstanding debt is rejected.
6. Expenses cannot be created with split shares not summing to total.
7. Per-group currency enforced on group expenses/settlements.
8. Empty states shown for all new users with direct setup CTAs.

## 7. Testing and Acceptance Plan
1. Static checks: `npm run lint`, `npm run build`.
2. Unit tests:
   - Validation schemas.
   - Split balance calculator.
   - Reports summary generator rules.
3. API integration tests:
   - Auth register/login/logout/me.
   - Transactions/subscriptions/budgets CRUD.
   - Split group create/join (code+passcode), expense split, settlement, balances.
4. UI scenario tests:
   - New user signup -> redirected to empty dashboard with guided CTAs.
   - Add first transaction/subscription/budget updates reports and notifications.
   - Create split group -> invite member -> add expense -> settle -> activity updates.
   - Every major button from dashboard/transactions/subscriptions/settings produces expected state change.

## 8. Implementation Sequence
1. Foundation: schemas, shared API error contract, middleware, auth me/logout, user settings endpoint.
2. Wire existing domains: transactions + subscriptions + budgets + reports (remove mock runtime usage).
3. UI interaction consistency pass: action menus/modals/toasts/empty states/notification panel.
4. Split advanced module: models, APIs, pages, balance engine, invite code+passcode flow.
5. Final hardening: destructive action guards, edge-case handling, full regression pass.

## 9. Assumptions and Defaults
1. No outbound email service in this pass; invite sharing is in-app (code + passcode).
2. JWT cookie auth remains current mechanism.
3. Existing MongoDB/Redis setup remains; Redis may be used for short-lived invite throttling/cache only if needed.
4. Existing visual theme stays, but interaction consistency and component quality are standardized.
5. No cross-currency conversion is implemented; each split group uses one selected currency.
