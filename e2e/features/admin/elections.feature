@admin @elections
Feature: Admins run elections from Admin › Elections
  As a BCS Seattle admin
  I want to set up, publish and stop elections from the admin pages
  So that nobody has to write SQL to run an election

  The new flow is behind the enableElectionManagement flag, which the e2e
  environment turns on (docs/election-management-plan.md, Phase 2).

  @P0 @critical
  Scenario: An admin sets up a draft step by step and publishes it
    Given I am signed in as an admin
    When I start a new leadership election called "Board and officers 2027"
    Then I should be on the "Positions & initiatives" step
    When I add the position "Director" with 3 seats
    And I save the timeline and settings as they are
    Then I should see "Ready to publish"
    And I should see "Director (3 seats)"
    When I publish the election
    Then I should see the message "Election published."
    And the election's status should be "scheduled"
    And the election should be listed under "Upcoming" with the action "Preview"
    And the election's activity should show "Published the election"

  @P1
  Scenario: The timeline step refuses dates out of order and keeps what was typed
    Given I am signed in as an admin
    When I start a new leadership election called "Out of order"
    And I go to the "Timeline" step
    And I set nominations to close after voting opens
    Then I should see "Nominations must close before voting opens."
    And the "Nominations close" field should still show what I typed

  @P1
  Scenario: A draft that can't be published says why
    Given I am signed in as an admin
    When I start a new initiative election called "Nothing on it"
    And I open the election's admin page
    Then I should see "Not ready to publish"
    And I should see "Add at least one position or initiative."

  @P1
  Scenario: An admin deletes a draft
    Given I am signed in as an admin
    When I start a new leadership election called "Started by mistake"
    And I delete the draft
    Then I should see the message "Draft deleted."
    And the election should no longer exist

  @P0 @critical
  Scenario: An admin cancels a published election and members see why
    Given there is an upcoming election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I cancel the election because "Postponed to the spring meeting"
    Then I should see the message "Election cancelled."
    And the election's status should be "cancelled"
    And the election's activity should show "Cancelled the election" with the reason "Postponed to the spring meeting"
    When I open the election
    Then I should see "This election was cancelled"
    And I should see "Postponed to the spring meeting"

  @P1
  Scenario: Cancelling needs a reason
    Given there is an upcoming election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I try to cancel the election without a reason
    Then I should see "Give a reason. It’s recorded in the activity log."
    And the election's status should be "ballot_locked"

  @P1
  Scenario: A member who isn't an admin is turned away from creating elections
    Given I am signed in as an approved member
    When I go to "/admin/elections/new"
    Then I should be on the home page

  @P2 @a11y @mobile
  Scenario Outline: <path> has no serious accessibility problems and fits a phone
    Given I am signed in as an admin
    When I go to "<path>"
    Then an accessibility scan should find no serious problems
    And the page should fit the screen width

    Examples:
      | path                  |
      | /admin/elections      |
      | /admin/elections/new  |

  @P2 @a11y @mobile
  Scenario: An election's admin pages have no serious accessibility problems and fit a phone
    Given there is an upcoming election with candidates "Hani" and "Nazir" for "President"
    And the election is still a draft
    And I am signed in as an admin
    Then each of the election's admin pages should have no serious accessibility problems and fit the screen
