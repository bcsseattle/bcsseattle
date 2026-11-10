@account
Feature: Member account and community funds
  As an approved member
  I want to manage my details and see how the community's money is used
  So that my records are right and I can trust the organisation

  @P1 @smoke
  Scenario: A member sees their account settings
    Given I am signed in as an approved member
    When I go to "/account"
    Then I should see the heading "My account"
    And I should see "Contributions Receipt"

  @P1
  Scenario: A member changes the name on their account
    Given I am signed in as an approved member
    When I change my name to "Amina Rahimi"
    Then I should see "Your name has been updated."
    And my account name should be "Amina Rahimi"

  @P1
  Scenario: A member can choose a contribution plan
    Given I am signed in as an approved member
    When I go to "/contribute"
    Then I should see the heading "Contribution Plans"
    And I should see the contribution plans "Monthly", "Six Months" and "Annual"

  @P1
  Scenario: A registered applicant is asked to pay the membership fee
    Given I am signed in as a pending applicant
    When I go to "/membership-fee"
    Then I should see "Membership Fee"
    And I should see a "Pay USD 20.00" button

  @P1
  Scenario: An approved member sees the community's finances
    Given I am signed in as an approved member
    When I go to "/community-funds"
    Then I should see "Bank Balance"
    And I should see "Expenses"
    And I should see "Processing Fees"
    And I should see "Available Funds"

  @P1 @payments @BUG-040
  Scenario: The estimated bank balance counts only money that arrived outside Stripe
    Given a completed $500 external donation
    And a pending $300 card donation
    And I am signed in as an approved member
    When I go to "/community-funds"
    Then the estimated bank balance should count only money received outside Stripe

  @P1
  Scenario: An applicant can't see the community's finances yet
    Given I am signed in as a pending applicant
    When I go to "/community-funds"
    Then I should see the heading "Membership Status: Pending"
