@fundraisers @admin
Feature: Admins manage fundraisers
  As a BCS Seattle admin
  I want to create and update fundraisers
  So that the community can raise money for people who need it

  @P0 @smoke @critical
  Scenario: An admin creates a fundraiser and it goes live
    Given I am signed in as an admin
    When I create a fundraiser titled "Funeral costs for a community elder" with a goal of $5,000
    Then the fundraiser "Funeral costs for a community elder" should be active with a goal of $5,000
    When I go to the fundraisers page
    Then I should see "Funeral costs for a community elder"

  # After creating, the app navigates to the new fundraiser client-side and the
  # page never leaves its loading skeleton; a full reload shows it.
  @P1 @BUG-074
  Scenario: After creating a fundraiser the admin lands on its page
    Given I am signed in as an admin
    When I create a fundraiser titled "Funeral costs for a community elder" with a goal of $5,000
    Then I should see the heading "Funeral costs for a community elder"

  @P1
  Scenario Outline: The fundraiser form explains what's wrong
    Given I am signed in as an admin
    When I submit a new fundraiser with <field> "<value>"
    Then I should see "<message>"

    Examples:
      | field       | value     | message                                     |
      | title       | Help      | Title must be at least 5 characters         |
      | description | Too short | Description must be at least 20 characters  |

  @P1
  Scenario: A goal under $100 is refused
    Given I am signed in as an admin
    When I submit a new fundraiser with goal "50"
    Then the "Goal Amount ($)" field should be marked invalid
    And I should be on the "/fundraisers/admin/new" page

  @P0 @critical
  Scenario: A member who isn't an admin can't create fundraisers
    Given I am signed in as an approved member
    When I go to "/fundraisers/admin/new"
    Then I should be on the fundraisers page
    And I should not see "Create New Fundraiser"

  @P1 @BUG-004
  Scenario: An admin is offered the "New Fundraiser" button
    Given there is an active fundraiser "Help the Rahimi family" with a goal of $1,000
    And I am signed in as an admin
    When I go to the fundraisers page
    Then I should see a "New Fundraiser" button

  @P1 @BUG-004 @BUG-017
  Scenario: An admin renames a fundraiser
    Given there is an active fundraiser "Help the Rahimi family" with a goal of $1,000
    And I am signed in as an admin
    When I rename the fundraiser to "Help the Rahimi family rebuild"
    Then the fundraiser should be saved as "Help the Rahimi family rebuild"

  @P1
  Scenario: An admin posts an update on a fundraiser
    Given I am signed in as an admin
    And there is an active fundraiser "Roof repair" with a goal of $2,000
    When I open the fundraiser
    And I post the update "We are halfway there, thank you!"
    Then I should see "We are halfway there, thank you!"
    And the fundraiser should have the update "We are halfway there, thank you!"
