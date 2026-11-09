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

  @P0 @security @known-bug @BUG-009
  Scenario: A member cannot download another member's contribution statement
    Given there is an approved member named "Amina"
    And "Amina" has paid a contribution this year
    And there is an approved member named "Bilal"
    And I am signed in as "Bilal"
    When I request the contribution statement of "Amina" for this year
    Then I should not receive a PDF document

  @P0 @security @known-bug @BUG-010
  Scenario: A member cannot open another member's private details page
    Given there is an approved member named "Amina"
    And there is a user with no membership named "Bilal"
    And I am signed in as "Bilal"
    When I open the member details page of "Amina"
    Then I should not see "Amina"'s name
