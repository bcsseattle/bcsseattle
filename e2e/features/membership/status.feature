@membership
Feature: Membership status
  As an applicant or member
  I want the site to tell me where my membership stands
  So that I know what I can do and what to do next

  @P1
  Scenario: An approved member can open the member directory
    Given I am signed in as an approved member
    When I go to "/members"
    Then I should see "BCS Seattle Members"

  @P1
  Scenario: A pending applicant is told their application is awaiting approval
    Given I am signed in as a pending applicant
    When I go to "/members"
    Then I should see the heading "Membership Status: Pending"

  @P1
  Scenario: An inactive member is told to contact support
    Given I am signed in as an inactive member
    When I go to "/members"
    Then I should see "Your membership is inactive. Please contact support for assistance."

  @P1 @known-bug @BUG-072
  Scenario: Someone who has just registered sees that their application is pending
    Given I am signed in as a user with no membership
    When I register as an individual member living in Seattle, WA
    And I go to "/members"
    Then I should see the heading "Membership Status: Pending"

  @P2 @known-bug @BUG-056
  Scenario: A signed-in user who never registered is sent to registration, not a broken page
    Given I am signed in as a user with no membership
    When I go to "/members"
    Then I should not be on a page for an undefined member
