@admin @elections @results
Feature: Counting, certifying and publishing results
  As a BCS Seattle admin
  I want to certify the count, settle ties with a run-off and publish the results
  So that members see a final, checked result and nobody sees counts too early

  Phase 5 of docs/election-management-plan.md, behind enableElectionManagement.

  @P0 @critical @lifecycle
  Scenario: A whole election, from draft to published results
    Given there is an approved member named "Zara"
    And there is an approved member named "Bilal"
    And there is an approved member named "Karim"
    And I am signed in as an admin
    When I start a new leadership election called "Lifecycle election"
    And I keep the ballot as it is
    And I save the timeline and settings as they are
    And I publish the election
    Then I should see the message "Election published."
    When time passes until nominations open
    And "Zara" nominates themselves for "President" through the public API
    And "Bilal" nominates themselves for "President" through the public API
    And "Karim" nominates themselves for "Treasurer" through the public API
    And I approve "Zara"'s nomination
    And I approve "Bilal"'s nomination
    And I approve "Karim"'s nomination
    And time passes until nominations close
    And I mark "Secretary" vacant
    And I lock the ballot
    Then I should see the message "Ballot locked."
    When time passes until voting opens
    And "Zara" votes for "Zara" through the vote API
    And "Karim" votes for "Zara" through the vote API
    And "Bilal" votes for "Bilal" through the vote API
    Then the turnout should show "3 (" voted for candidates
    When time passes until voting closes
    And I certify the results
    Then I should see the message "Results certified."
    When I publish the results
    Then I should see the message "Results published."
    And the election's status should be "completed"
    And the published results should show "Zara" elected for "President"
    And the published results should show "Karim" elected unopposed for "Treasurer"
    And the CSV of the results should list "Bilal" as "Not elected"

  @P0 @critical
  Scenario: A tie can't be certified until a run-off settles it
    Given there is an election being counted with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 2 votes
    And I am signed in as an admin
    When I open the election's "Results" tab
    Then I should see "Tied: run-off"
    And I should see "Settle the ties with a run-off first."
    When I start a run-off for "President"
    Then I should see the message "Run-off created."
    And a run-off for "President" should exist between "Hani" and "Nazir"

  @P1
  Scenario: Certified results can be reopened before they're published
    Given there is an election being counted with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an admin
    When I certify the results
    Then I should see the message "Results certified."
    And the election's status should be "certified"
    And the CSV of the results should list "Hani" as "Elected"
    When I open the election's "Results" tab
    And I reopen the certification because "Recount requested"
    Then I should see the message "Certification reopened."
    And the election's status should be "ballot_locked"

  @P0 @security @api
  Scenario: Members don't see the count before results are published
    Given there is an election being counted with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And there is an approved member named "Bilal"
    And I am signed in as "Bilal"
    When I fetch the published results of the election
    Then the results should wait for certification
    When "Bilal" asks for the count through the public API
    Then the call should be refused with "Only admins"

  @P0 @security @api
  Scenario: Nobody, admins included, sees a count while voting is open
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an admin named "Ayaan"
    When "Ayaan" asks for the count through the public API
    Then the call should be refused with "once voting has closed"

  @P2 @a11y @mobile
  Scenario: The Results tab has no serious accessibility problems and fits a phone
    Given there is an election being counted with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an admin
    When I open the election's "Results" tab
    Then an accessibility scan should find no serious problems
    And the page should fit the screen width
