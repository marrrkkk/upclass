# Implementation Plan: Organization Multi-Tenancy

## Overview

This plan transforms Upclass into a multi-tenant SaaS platform by adding organization support. Implementation proceeds from database schema and validation foundations, through server actions and middleware, to UI components and integration wiring. Each task builds incrementally on previous steps to avoid orphaned code.

## Tasks

- [x] 1. Database schema and enums
  - [x] 1.0 Clear the database and remove existing migrations
    - Drop all tables by running `drizzle-kit push --force-reset` or manually dropping the public schema and recreating it (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`)
    - Delete all files in `db/migrations/` to start fresh
    - This allows the new schema (with organization tables) to be generated as a single clean migration
    - _Requirements: 1.1_

  - [x] 1.1 Define new enums and organization-related tables in `db/schema.ts`
    - Add `orgRole` enum (`admin`, `teacher`, `student`) and `invitationStatus` enum (`pending`, `accepted`, `expired`, `cancelled`)
    - Add `organization` table with id, name, slug (unique), description, logo, createdBy FK, timestamps
    - Add `orgMembership` table with id, organizationId FK (cascade), userId FK (cascade), role, timestamps; unique index on (organizationId, userId)
    - Add `orgInvitation` table with id, organizationId FK (cascade), email, role, token (unique), invitedBy FK, status, expiresAt, acceptedAt, createdAt; indexes on token, (organizationId, email)
    - Add `orgResource` table with id, organizationId FK (cascade), title, description, category, fileUrl, fileName, fileType (reuse existing enum), fileSize, uploadedBy FK, sourceClassId FK (nullable), sourceResourceId FK (nullable), timestamps; unique partial index on (organizationId, sourceResourceId) where not null
    - Add `organizationId` nullable FK column to existing `classes` table with index
    - Add Drizzle relations for all new tables
    - _Requirements: 1.1, 1.3, 2.1, 2.5, 3.2, 4.1, 7.1, 8.1, 8.6_

  - [x] 1.2 Generate and apply Drizzle migration
    - Run `drizzle-kit generate` to produce the migration SQL
    - Verify migration applies cleanly with `npm run db:migrate`
    - _Requirements: 1.1, 1.3_

- [x] 2. Validation schemas and utility functions
  - [x] 2.1 Create `lib/validation/organizations.ts` with Zod schemas
    - `orgNameSchema`: string 2-100 chars, regex `/^[a-zA-Z0-9\s\-&']+$/`
    - `orgDescriptionSchema`: string max 500, optional
    - `orgRoleSchema`: enum `["admin", "teacher", "student"]`
    - `createInvitationSchema`: object with email + role
    - `bulkEnrollSchema`: object with classId + studentIds (1-200 array)
    - `createOrgClassSchema`: object with title (2-100), optional description and category
    - `updateOrgSettingsSchema`: object with name, description, logo URL optional
    - _Requirements: 1.2, 1.5, 2.1, 2.7, 6.1, 4.1, 10.1, 10.2_

  - [x] 2.2 Create `lib/org-slug.ts` with slug generation utilities
    - `generateSlug(name: string): string` — lowercase, replace spaces with hyphens, remove disallowed chars, truncate to 120
    - `generateUniqueSlug(name: string, existingSlugs: string[]): string` — append `-1`, `-2` etc. if base slug exists
    - _Requirements: 1.3, 1.4, 10.4_

  - [ ]* 2.3 Write property tests for organization name validation
    - **Property 1: Organization Name Validation**
    - **Validates: Requirements 1.2, 1.5**
    - Create `tests/properties/org-name-validation.property.test.ts`
    - Use fast-check to generate random strings and verify acceptance/rejection matches schema rules

  - [ ]* 2.4 Write property tests for slug generation
    - **Property 2: Slug Derivation Correctness**
    - **Validates: Requirements 1.3**
    - Create `tests/properties/org-slug.property.test.ts`
    - Verify slug equals lowercased name with spaces→hyphens, disallowed chars removed, truncated to 120

  - [ ]* 2.5 Write property test for slug uniqueness
    - **Property 3: Slug Uniqueness with Sequential Suffix**
    - **Validates: Requirements 1.4**
    - Verify that for duplicate base slugs, sequential suffixes are appended and all results are unique

- [x] 3. Zustand organization store and middleware
  - [x] 3.1 Create `stores/org-store.ts` with organization state
    - Define `OrgState` interface with `activeOrgId`, `activeOrgSlug`, `orgs` array, `setActiveOrg`, `setOrgs`
    - Implement Zustand store with persistence (cookie sync for `activeOrgSlug`)
    - _Requirements: 9.3, 9.5_

  - [x] 3.2 Create organization context middleware in `middleware.ts` or extend existing
    - Read `x-org-slug` cookie to resolve active organization
    - Inject org context into request headers for server actions
    - Handle missing/invalid org context gracefully
    - _Requirements: 9.4, 9.5_

- [x] 4. Organization server actions
  - [x] 4.1 Create `app/actions/organizations.ts`
    - `createOrganization(input)`: validate name, generate unique slug, create org + admin membership in transaction
    - `getOrganization(slug)`: fetch org details with auth check
    - `updateOrganizationSettings(input)`: validate, update name/description/logo (slug unchanged)
    - `deleteOrganization(orgId)`: admin-only, cascade handled by DB
    - `getUserOrganizations()`: list all orgs for current user with roles
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.1, 10.2, 10.3, 10.5, 10.6_

  - [ ]* 4.2 Write property test for organization creator becomes admin
    - **Property 4: Organization Creator Becomes Admin**
    - **Validates: Requirements 1.1**
    - Create `tests/properties/org-creation.property.test.ts`

  - [ ]* 4.3 Write property test for slug stability on name update
    - **Property 22: Slug Stability on Name Update**
    - **Validates: Requirements 10.5**
    - Verify slug remains unchanged after organization name update

  - [x] 4.4 Create `app/actions/org-members.ts`
    - `listMembers(orgId)`: list all org members with roles
    - `changeRole(orgId, userId, newRole)`: admin-only, validate role, reject same-role, protect last admin
    - `removeMember(orgId, userId)`: admin-only, cascade class memberships for org classes, reject last-admin removal
    - `getCurrentUserOrgRole(orgId)`: return current user's role in specified org
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 4.5 Write property tests for role management
    - **Property 8: Last Admin Protection**
    - **Property 10: Same-Role Change Rejection**
    - **Validates: Requirements 3.3, 3.6**
    - Create `tests/properties/org-authorization.property.test.ts`

  - [ ]* 4.6 Write property test for role-based authorization
    - **Property 5: Role-Based Authorization Enforcement**
    - **Validates: Requirements 2.2, 3.5, 4.2, 6.6, 7.3, 8.2, 10.3**
    - Test authorization matrix across random user/role/operation combinations

  - [ ]* 4.7 Write property test for member removal cascading
    - **Property 9: Member Removal Cascades Class Memberships**
    - **Validates: Requirements 3.4**

  - [ ]* 4.8 Write property test for role isolation across organizations
    - **Property 20: Role Isolation Across Organizations**
    - **Validates: Requirements 9.2**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Invitation server actions
  - [x] 6.1 Create `app/actions/org-invitations.ts`
    - `createInvitation(orgId, email, role)`: admin-only, validate email/role, check duplicate pending invite, check existing member, generate token with 7-day expiry, send email via Resend
    - `listPendingInvitations(orgId)`: admin-only, return pending invitations
    - `cancelInvitation(orgId, invitationId)`: admin-only, set status to cancelled
    - `acceptInvitation(token)`: validate token not expired/used, create membership in transaction, mark invitation accepted
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 6.2 Write property tests for invitation flow
    - **Property 6: Invitation Acceptance Round-Trip**
    - **Property 7: Invitation Uniqueness Constraints**
    - **Validates: Requirements 2.3, 2.4, 2.8**
    - Create `tests/properties/org-invitations.property.test.ts`

- [x] 7. Enrollment server actions
  - [x] 7.1 Create `app/actions/enrollments.ts`
    - `listAvailableClasses(orgId)`: student self-enrollment view, return org classes not already enrolled in (max 100)
    - `selfEnroll(orgId, classId)`: student-only, validate org membership, check not already enrolled, add class membership
    - `bulkEnroll(orgId, classId, studentIds)`: teacher/admin, validate all students are org members with student role, skip already-enrolled, return summary
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 7.2 Write property tests for enrollment
    - **Property 13: Self-Enrollment Correctness**
    - **Property 14: Bulk Enrollment Summary Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5**
    - Create `tests/properties/bulk-enrollment.property.test.ts`

- [x] 8. Organization resource server actions
  - [x] 8.1 Create `app/actions/org-resources.ts`
    - `uploadOrgResource(orgId, input)`: teacher/admin only, validate file size ≤50MB, store in org_resource table
    - `listOrgResources(orgId)`: return all org resources ordered by createdAt desc, org-member access only
    - `publishClassResource(orgId, classId, resourceId)`: teacher/admin + class member, check not already published, create linked org_resource copy with metadata
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 8.2 Write property tests for org library and publishing
    - **Property 15: Org Library Resource Visibility**
    - **Property 16: Org Library Ordering**
    - **Property 17: Publish Creates Linked Copy With Metadata**
    - **Property 18: Double-Publish Rejection**
    - **Property 19: Published Resource Independence**
    - **Validates: Requirements 7.2, 7.4, 8.1, 8.3, 8.4, 8.6**
    - Create `tests/properties/org-library.property.test.ts` and `tests/properties/resource-publish.property.test.ts`

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Organization UI components
  - [x] 10.1 Create `components/layouts/org-switcher.tsx`
    - Dropdown in sidebar showing active org name/logo
    - List all user orgs, click to switch (updates cookie + store)
    - "Create Organization" option at bottom
    - _Requirements: 9.3, 9.5_

  - [x] 10.2 Create `components/organizations/org-create-dialog.tsx`
    - Modal form with name input, optional description
    - Client-side validation using orgNameSchema
    - Calls `createOrganization` action on submit
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 10.3 Create `components/organizations/org-settings-form.tsx`
    - Form for editing org name, description, logo upload
    - Logo preview with crop (using react-easy-crop)
    - Validates constraints (2 MB, JPEG/PNG/WebP)
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 10.4 Create `components/organizations/member-table.tsx`
    - Table of org members with columns: avatar, name, email, role, actions
    - Role change dropdown (admin-only)
    - Remove member button with confirmation
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 10.5 Create `components/organizations/invite-member-dialog.tsx`
    - Dialog with email input and role selector
    - Validation feedback for invalid emails
    - Success/error toast on submission
    - _Requirements: 2.1, 2.7_

  - [x] 10.6 Create `components/organizations/class-browser.tsx`
    - Grid of available classes with title, description, category
    - "Enroll" button per class
    - Empty state when all classes enrolled
    - _Requirements: 5.1, 5.2_

  - [x] 10.7 Create `components/organizations/bulk-enroll-dialog.tsx`
    - Multi-select student picker (org members with student role)
    - Class selector
    - Summary display after enrollment (enrolled/skipped/failed counts)
    - _Requirements: 6.1, 6.4_

  - [x] 10.8 Create `components/organizations/org-resource-library.tsx`
    - Grid/list view of org resources with title, category, file type, upload date
    - Upload button for teachers/admins
    - Filter by category
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 10.9 Create `components/organizations/publish-resource-button.tsx`
    - Button shown on class resources for teachers/admins
    - Confirmation dialog before publishing
    - Disabled state if already published
    - _Requirements: 8.1, 8.3_

- [ ] 11. Organization data isolation
  - [ ]* 11.1 Write property test for data isolation
    - **Property 11: Organization Data Isolation**
    - **Validates: Requirements 4.3, 5.3, 9.4**
    - Create `tests/properties/org-isolation.property.test.ts`
    - Verify cross-org queries never leak data

  - [ ]* 11.2 Write unit tests for slug and validation utilities
    - Create `tests/unit/org-slug.test.ts` and `tests/unit/org-validation.test.ts`
    - Test edge cases: empty strings, max length, special chars, unicode
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 12. Integration and wiring
  - [x] 12.1 Create organization route pages under `app/(main)/org/[slug]/`
    - `page.tsx` — org dashboard showing class count, member count, recent activity
    - `members/page.tsx` — member management with MemberTable + InviteMemberDialog
    - `settings/page.tsx` — OrgSettingsForm
    - `classes/page.tsx` — class list within org with create button
    - `library/page.tsx` — OrgResourceLibrary
    - `enroll/page.tsx` — ClassBrowser for students
    - _Requirements: 4.3, 7.1, 9.3, 10.1_

  - [x] 12.2 Wire OrgSwitcher into the existing sidebar layout
    - Add OrgSwitcher to `components/layouts/home-shell.tsx` or sidebar
    - Initialize org store from server-fetched user orgs on layout mount
    - Set cookie on org switch for middleware resolution
    - _Requirements: 9.3, 9.5_

  - [x] 12.3 Update class creation flow to associate with active organization
    - Modify existing class creation action/UI to pass `organizationId` when in org context
    - Ensure backward compatibility for classes without org (nullable FK)
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 12.4 Write integration tests for key flows
    - Test invitation → acceptance → membership creation
    - Test member removal with class membership cascade
    - Test self-enrollment and bulk enrollment end-to-end
    - Create files in `tests/server/` directory
    - _Requirements: 2.3, 3.4, 5.2, 6.1_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout; all implementation follows existing project conventions
- fast-check is used for property-based tests with 100 iterations minimum per property
- Database migration should be verified locally before proceeding to server actions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.0"] },
    { "id": 1, "tasks": ["1.1"] },
    { "id": 2, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "3.1", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.4", "6.1", "7.1", "8.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.5", "4.6", "4.7", "4.8", "6.2", "7.2", "8.2"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9"] },
    { "id": 7, "tasks": ["11.1", "11.2", "12.1", "12.2", "12.3"] },
    { "id": 8, "tasks": ["12.4"] }
  ]
}
```
