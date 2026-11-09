@admin
Feature: Admin pages have no dead ends
  As a BCS Seattle admin
  I want every admin link to open a working page
  So that I can manage members, elections, expenses and fundraisers

  Background:
    Given I am signed in as an admin

  @P1 @critical
  Scenario: An admin sees elections in Election Management
    Given there is an open election with the initiative "Build a community garden"
    When I go to "/admin/elections"
    Then I should see the heading "Election Management"
    And I should see the election in the list as "Open"

  @P1 @BUG-047
  Scenario Outline: No link in the admin area leads to a missing page
    When I go to "<path>"
    And I open the "Admin" menu
    Then every link on the page should open a page that exists

    Examples:
      | path             |
      | /admin/members   |
      | /admin/elections |
      | /admin/expenses  |
