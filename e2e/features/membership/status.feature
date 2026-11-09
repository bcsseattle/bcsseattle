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

  @P1 @BUG-072
  Scenario: Someone who has just registered sees that their application is pending
    Given I am signed in as a user with no membership
    When I register as an individual member living in Seattle, WA
    And I go to "/members"
    Then I should see the heading "Membership Status: Pending"

  @P2 @BUG-056
  Scenario: A signed-in user who never registered is sent to registration, not a broken page
    Given I am signed in as a user with no membership
    When I go to "/members"
    Then I should not be on a page for an undefined member

  @P0 @critical @payments @BUG-023
  Scenario: Cancelling the contribution plan ends the membership
    Given I am signed in as an approved member
    And I have an active contribution plan
    When Stripe reports my contribution plan as active
    Then my membership should be active
    When Stripe reports my contribution plan as cancelled
    Then my membership should be inactive

  @P1 @payments @BUG-024
  Scenario: A cancelled recurring donation doesn't end an active membership
    Given I am signed in as an approved member
    And I have an active contribution plan
    And I have an active recurring donation
    When Stripe reports my contribution plan as active
    And Stripe reports my recurring donation as cancelled
    Then my membership should be active

  @P1 @BUG-035
  Scenario: A rejected applicant is told their application wasn't approved
    Given I am signed in as a rejected applicant
    When I go to "/members"
    Then I should see "Your membership application was not approved."

  @P2 @BUG-056
  Scenario Outline: A signed-in user who never registered is sent to registration from <path>
    Given I am signed in as a user with no membership
    When I go to "<path>"
    Then I should be on the registration page

    Examples:
      | path             |
      | /members         |
      | /community-funds |
      | /elections       |
