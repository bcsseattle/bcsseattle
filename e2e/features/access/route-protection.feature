@access
Feature: Members-only and admin-only pages are protected
  As BCS Seattle
  I want private pages to be reachable only by the right people
  So that members' personal and financial details stay private

  @P0 @smoke @critical
  Scenario Outline: A visitor who isn't signed in is asked to sign in before opening <path>
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then I should be asked to sign in before reaching "<path>"

    Examples:
      | path                   |
      | /account               |
      | /admin/members         |
      | /elections             |
      | /community-funds       |
      | /members               |
      | /membership-fee        |
      | /contribute            |
      | /fundraisers/admin/new |

  @P0 @smoke @critical
  Scenario: An admin can open member management
    Given I am signed in as an admin
    When I go to "/admin/members"
    Then I should see the heading "Member Management"

  @P0 @critical
  Scenario: A member who isn't an admin is turned away from member management
    Given I am signed in as an approved member
    When I go to "/admin/members"
    Then I should be on the home page
    And I should not see "Member Management"

  @P0 @critical
  Scenario: A member can download their own contribution statement
    Given there is an approved member named "Amina"
    And "Amina" has paid a contribution this year
    And I am signed in as "Amina"
    When I request the contribution statement of "Amina" for this year
    Then I should receive a PDF document

  # Statements are open to approved members (community transparency, confirmed
  # 2026-11-08); since the BUG-003 fix, RLS keeps everyone else out.
  @P0 @security @BUG-009
  Scenario: Someone without a membership cannot download a member's contribution statement
    Given there is an approved member named "Amina"
    And "Amina" has paid a contribution this year
    And there is a user with no membership named "Bilal"
    And I am signed in as "Bilal"
    When I request the contribution statement of "Amina" for this year
    Then I should not receive a PDF document

  @P1
  Scenario: An approved member can download another member's contribution statement
    Given there is an approved member named "Amina"
    And "Amina" has paid a contribution this year
    And there is an approved member named "Bilal"
    And I am signed in as "Bilal"
    When I request the contribution statement of "Amina" for this year
    Then I should receive a PDF document

  # Approved members may see each other's details, contributions included
  # (confirmed 2026-11-08). Since the BUG-003 fix, RLS hides member rows from
  # anyone who isn't an approved, active member.
  @P0 @security @BUG-010
  Scenario: Someone without a membership cannot open a member's details page
    Given there is an approved member named "Amina"
    And there is a user with no membership named "Bilal"
    And I am signed in as "Bilal"
    When I open the member details page of "Amina"
    Then I should not see "Amina"'s name

  @P1
  Scenario: An approved member can see another member's details and contributions
    Given there is an approved member named "Amina"
    And I am signed in as an approved member
    When I open the member details page of "Amina"
    Then I should see "Amina"'s details and total contributions
