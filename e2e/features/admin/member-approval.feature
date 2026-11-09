@admin
Feature: Admins review membership applications
  As a BCS Seattle admin
  I want to approve, reject and deactivate memberships
  So that only eligible people get member benefits and voting rights

  Background:
    Given I am signed in as an admin

  @P0 @smoke @critical
  Scenario: An admin approves a pending application
    Given there is a pending applicant named "Hani"
    When I approve the membership of "Hani"
    Then "Hani" should be listed as "Active"
    And "Hani" should be an approved member

  @P1
  Scenario: Cancelling the approval dialog changes nothing
    Given there is a pending applicant named "Hani"
    When I start approving the membership of "Hani" but cancel
    Then "Hani" should be listed as "Pending"
    And "Hani"'s membership should still be awaiting approval

  @P1 @known-bug @BUG-035
  Scenario: A rejected applicant no longer appears as a pending application
    Given there is a pending applicant named "Hani"
    When I reject the membership application of "Hani"
    Then "Hani" should not be listed as "Pending"

  @P1 @known-bug @BUG-035
  Scenario: A deactivated member is shown as inactive, not as a new application
    Given there is an approved member named "Hani"
    When I deactivate the membership of "Hani"
    Then "Hani" should be listed as "Inactive"

  @P1 @known-bug @BUG-036
  Scenario: The admin can see each applicant's email address
    Given there is a pending applicant named "Hani"
    When I go to "/admin/members"
    Then the row for "Hani" should show their email address

  @P2
  Scenario: An admin can reactivate an approved member whose membership lapsed
    Given there is an approved member named "Hani" whose membership has lapsed
    When I reactivate the membership of "Hani"
    Then "Hani" should be listed as "Active"
