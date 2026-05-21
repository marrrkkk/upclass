# Requirements Document

## Introduction

This feature transforms the existing Upclass application from a simple teacher/student role-based system into a multi-tenant SaaS platform with organization (school) support. Organizations serve as the top-level tenant, scoping classes, resources, and membership. Users can belong to multiple organizations, each with independent role assignments. The resource model is hybrid: organizations maintain a shared library visible to all members, while classes retain their own scoped resources with an option for teachers to publish class resources to the org library.

## Glossary

- **Organization**: A top-level tenant entity representing a school or institution that contains members, classes, and a shared resource library
- **Org_Admin**: A user with the admin role within an organization, capable of managing members, roles, and organizational settings
- **Org_Member**: A user who belongs to an organization with an assigned role (admin, teacher, or student)
- **Org_Role**: The role assigned to a user within a specific organization; one of admin, teacher, or student
- **Org_Library**: A shared collection of resources at the organization level, visible to all organization members
- **Class_Resource**: A resource scoped to a specific class, visible only to members of that class
- **Org_Invitation**: A pending invite for a user to join an organization with a pre-assigned role
- **Enrollment**: The association of a student with a class within their organization
- **Membership_Service**: The backend service responsible for managing organization membership operations
- **Invitation_Service**: The backend service responsible for creating, validating, and processing organization invitations
- **Class_Service**: The backend service responsible for managing class creation and assignment within organizations
- **Resource_Service**: The backend service responsible for managing resources at both class and organization levels
- **Enrollment_Service**: The backend service responsible for managing student enrollment into classes

## Requirements

### Requirement 1: Organization Creation

**User Story:** As a user, I want to create a new organization, so that I can establish a school or institution as a multi-tenant workspace.

#### Acceptance Criteria

1. WHEN a user submits a valid organization name, THE Membership_Service SHALL create a new Organization entity with a unique identifier and assign the creating user as an Org_Admin
2. THE Membership_Service SHALL require an organization name between 2 and 100 characters containing only letters, numbers, spaces, hyphens, ampersands, and apostrophes
3. WHEN an Organization is created, THE Membership_Service SHALL generate a unique slug derived from the organization name by lowercasing, replacing spaces with hyphens, and removing disallowed characters, with a maximum slug length of 120 characters
4. IF the generated slug already exists, THEN THE Membership_Service SHALL append a sequential numeric suffix starting from 1 to ensure uniqueness
5. IF the submitted organization name is invalid, THEN THE Membership_Service SHALL reject the request and return an error message indicating the validation failure reason
6. IF the organization creation fails due to a system error, THEN THE Membership_Service SHALL not persist any partial data and SHALL return an error message indicating the operation could not be completed

### Requirement 2: Organization Member Invitation

**User Story:** As an org admin, I want to invite users to my organization, so that teachers and students can join and participate.

#### Acceptance Criteria

1. WHEN an Org_Admin provides a valid email address and an Org_Role (one of: admin, teacher, or student), THE Invitation_Service SHALL create an Org_Invitation and send an invitation email to the specified address containing the invitation token
2. THE Invitation_Service SHALL restrict invitation creation to users with the Org_Admin role within the target organization
3. WHEN a user accepts an Org_Invitation, THE Membership_Service SHALL add the user as an Org_Member with the pre-assigned Org_Role and invalidate the invitation token so it cannot be reused
4. IF an invitation is sent to an email that already belongs to an Org_Member of the same organization, THEN THE Invitation_Service SHALL reject the invitation and return an error indicating the user is already a member
5. WHEN an Org_Admin creates an invitation, THE Invitation_Service SHALL generate a unique invitation token that expires after 7 days from creation
6. IF an Org_Invitation token has expired, THEN THE Invitation_Service SHALL reject acceptance and return an error indicating the invitation has expired
7. IF an Org_Admin provides an email address that does not conform to a valid email format, THEN THE Invitation_Service SHALL reject the invitation and return a validation error
8. IF a pending Org_Invitation already exists for the same email address and organization, THEN THE Invitation_Service SHALL reject the duplicate invitation and return an error indicating a pending invitation already exists

### Requirement 3: Organization Role Management

**User Story:** As an org admin, I want to manage member roles within my organization, so that I can control access and responsibilities.

#### Acceptance Criteria

1. WHEN an Org_Admin changes a member's Org_Role, THE Membership_Service SHALL update the member's role and apply the new access permissions within 2 seconds of the request
2. THE Membership_Service SHALL support exactly three Org_Role values: admin, teacher, and student, and SHALL reject any role change request specifying a value outside this set
3. IF an Org_Admin attempts to change the role of the last remaining admin in an Organization to a non-admin role, THEN THE Membership_Service SHALL reject the operation and return an error indicating at least one admin is required
4. WHEN an Org_Admin removes a member from the Organization, THE Membership_Service SHALL revoke the member's access to all organization classes and resources and remove all Enrollment associations for that member within the Organization
5. THE Membership_Service SHALL restrict role changes and member removal operations to users with the Org_Admin role within the target Organization
6. IF an Org_Admin attempts to change a member's Org_Role to the same role they already hold, THEN THE Membership_Service SHALL reject the operation and return an error indicating the member already has the specified role

### Requirement 4: Classes Within Organizations

**User Story:** As a teacher or admin, I want to create and manage classes within my organization, so that instruction is scoped to the organization context.

#### Acceptance Criteria

1. WHEN a user with Org_Role of teacher or admin creates a class, THE Class_Service SHALL associate the class with the user's current organization and require a class name between 2 and 100 characters
2. THE Class_Service SHALL restrict class creation within an organization to members with Org_Role of teacher or admin
3. WHEN a class is created within an Organization, THE Class_Service SHALL make the class visible only to members of that Organization
4. WHEN an Org_Admin assigns a teacher to a class, THE Class_Service SHALL add the teacher as a class member with the teacher role, provided the teacher is an existing Org_Member of the same Organization as the class
5. WHEN a teacher with Org_Role creates a class, THE Class_Service SHALL automatically assign the creating teacher as the class owner
6. IF a user with Org_Role of student attempts to create a class, THEN THE Class_Service SHALL reject the request and return an error indicating insufficient permissions
7. IF an Org_Admin attempts to assign a teacher who is not an Org_Member of the class's Organization, THEN THE Class_Service SHALL reject the assignment and return an error indicating the teacher must be an organization member

### Requirement 5: Student Self-Enrollment

**User Story:** As a student, I want to browse and enroll in classes available within my organization, so that I can participate in courses without admin intervention.

#### Acceptance Criteria

1. WHEN a student with Org_Role of student requests to view available classes, THE Enrollment_Service SHALL return all classes within the student's Organization that the student is not already enrolled in, up to a maximum of 100 classes per response
2. WHEN a student selects a class for self-enrollment, THE Enrollment_Service SHALL add the student as a class member with the student role and return a confirmation indicating the enrollment was successful
3. THE Enrollment_Service SHALL restrict self-enrollment to classes within the student's own Organization
4. IF a student attempts to enroll in a class they are already a member of, THEN THE Enrollment_Service SHALL reject the enrollment and return an error indicating the student is already enrolled in the specified class
5. IF a student attempts to enroll in a class that does not exist or is not within their Organization, THEN THE Enrollment_Service SHALL reject the enrollment and return an error indicating the class is not available
6. IF the Enrollment_Service fails to complete the enrollment due to a service error, THEN THE Enrollment_Service SHALL not partially add the student and SHALL return an error indicating the enrollment could not be processed

### Requirement 6: Bulk Enrollment

**User Story:** As a teacher or admin, I want to enroll multiple students into a class at once, so that I can efficiently manage class rosters.

#### Acceptance Criteria

1. WHEN a user with Org_Role of teacher or admin provides a list of between 1 and 200 student identifiers and a target class within their Organization, THE Enrollment_Service SHALL enroll all valid students into the class
2. THE Enrollment_Service SHALL restrict bulk enrollment to students who are existing Org_Members with Org_Role of student in the same Organization as the target class
3. IF any student in a bulk enrollment request is already enrolled in the target class, THEN THE Enrollment_Service SHALL skip that student and continue processing the remaining students
4. WHEN bulk enrollment completes, THE Enrollment_Service SHALL return a summary indicating the count of successfully enrolled students, the count of skipped students, and the list of identifiers that failed validation
5. IF a bulk enrollment request contains a student identifier that does not correspond to an existing Org_Member of the same Organization, THEN THE Enrollment_Service SHALL skip that identifier, include it in the failed validation list, and continue processing the remaining students
6. THE Enrollment_Service SHALL restrict bulk enrollment operations to users with Org_Role of teacher or admin who are members of the target class or hold the Org_Admin role in the Organization

### Requirement 7: Organization Resource Library

**User Story:** As an org member, I want to access a shared resource library at the organization level, so that I can find materials relevant to my institution.

#### Acceptance Criteria

1. THE Resource_Service SHALL maintain an Org_Library for each Organization, accessible to all Org_Members of that Organization
2. WHEN an Org_Member with Org_Role of teacher or admin uploads a resource to the Org_Library, THE Resource_Service SHALL store the resource at the organization scope, associate it with the uploading member's Organization, and make it visible to all Org_Members of that Organization within 5 seconds
3. THE Resource_Service SHALL restrict direct uploads to the Org_Library to members with Org_Role of teacher or admin
4. WHEN an Org_Member requests the Org_Library contents, THE Resource_Service SHALL return all organization-scoped resources that belong to the member's Organization, ordered by upload date descending
5. IF an Org_Member with Org_Role of student attempts to upload a resource to the Org_Library, THEN THE Resource_Service SHALL reject the upload and return an error indicating insufficient permissions
6. IF a resource upload to the Org_Library fails due to an invalid or unsupported file, THEN THE Resource_Service SHALL reject the upload, return an error indicating the reason for rejection, and not persist any partial data
7. WHEN an Org_Member with Org_Role of teacher or admin uploads a resource to the Org_Library, THE Resource_Service SHALL enforce a maximum file size of 50 MB per resource

### Requirement 8: Publishing Class Resources to Organization Library

**User Story:** As a teacher, I want to publish a class resource to the organization library, so that it becomes available to all members across the organization.

#### Acceptance Criteria

1. WHEN a teacher selects a Class_Resource for publishing to the Org_Library, THE Resource_Service SHALL create an organization-scoped copy of the resource linked to the original, preserving the resource title, description, and file reference
2. THE Resource_Service SHALL restrict publishing to users with Org_Role of teacher or admin who are members of the class containing the resource
3. IF a Class_Resource has already been published to the Org_Library, THEN THE Resource_Service SHALL reject the publish request and return an error indicating the resource is already published
4. WHEN a resource is published to the Org_Library, THE Resource_Service SHALL retain the original Class_Resource independently in the class scope such that modifications to either copy do not affect the other
5. IF the specified Class_Resource does not exist or the requesting user is not a member of the class containing the resource, THEN THE Resource_Service SHALL reject the publish request and return an error indicating insufficient access
6. WHEN a resource is successfully published to the Org_Library, THE Resource_Service SHALL record the publishing user and the originating class as metadata on the organization-scoped copy

### Requirement 9: Multi-Organization Membership

**User Story:** As a user, I want to belong to multiple organizations, so that I can participate in different schools or institutions.

#### Acceptance Criteria

1. THE Membership_Service SHALL allow a single user to hold Org_Member status in up to 50 Organizations simultaneously
2. WHEN a user belongs to multiple Organizations, THE Membership_Service SHALL maintain independent Org_Role assignments for each Organization such that changing a role in one Organization does not affect roles in any other Organization
3. WHEN a user who belongs to multiple Organizations accesses the application, THE Membership_Service SHALL provide an organization switcher that displays the user's current active Organization and lists all other Organizations the user belongs to
4. THE Membership_Service SHALL isolate each Organization's data so that classes, resources, and members of one Organization are not visible from another Organization's context
5. WHEN a user switches from one Organization to another, THE Membership_Service SHALL set the selected Organization as the active context and apply the Org_Role permissions associated with that Organization within 2 seconds
6. IF a user is removed from an Organization while that Organization is their active context, THEN THE Membership_Service SHALL redirect the user to the next available Organization context, or to an organization selection state if no other memberships exist

### Requirement 10: Organization Settings and Profile

**User Story:** As an org admin, I want to configure my organization's profile and settings, so that the organization is identifiable and customizable.

#### Acceptance Criteria

1. WHEN an Org_Admin updates organization settings, THE Membership_Service SHALL persist the organization name (between 2 and 100 characters), description (up to 500 characters), and logo (accepted formats: JPEG, PNG, WebP; maximum file size: 2 MB)
2. IF an Org_Admin submits an organization name or description that exceeds the allowed character limits or a logo that exceeds the maximum file size or is not an accepted format, THEN THE Membership_Service SHALL reject the update and return an error indicating which field failed validation
3. THE Membership_Service SHALL restrict organization settings modification to users with the Org_Admin role
4. THE Membership_Service SHALL enforce a unique slug for each Organization to support URL-based identification
5. WHEN an Org_Admin updates the organization name, THE Membership_Service SHALL not change the existing slug to preserve URL stability
6. IF the Membership_Service fails to persist organization settings due to a service or storage error, THEN THE Membership_Service SHALL return an error indicating the update failed and preserve the previous settings unchanged
