@admin @expenses
Feature: Admins record the organisation's expenses
  As a BCS Seattle admin
  I want to add expenses as they are paid
  So that approved members can see how community funds are spent

  @P1 @critical
  Scenario: An admin adds an expense that members can see
    Given I am signed in as an admin
    When I add a $42.50 "Supplies" expense paid to "Costco"
    Then I should see the message "Expense added."
    And the expense should be listed on the expenses page
    And the expense should be recorded as public

  @P1
  Scenario: An admin adds a private expense
    Given I am signed in as an admin
    When I add a private $10 "Bank fees" expense paid to "Chase"
    Then the expense should be recorded as private

  @P1
  Scenario: A member who isn't an admin is turned away from expenses
    Given I am signed in as an approved member
    When I go to "/admin/expenses"
    Then I should be on the home page
