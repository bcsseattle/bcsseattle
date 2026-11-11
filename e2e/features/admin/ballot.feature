@admin @elections @ballot
Feature: Locking the ballot and running the vote
  As a BCS Seattle admin
  I want to settle every position, lock the ballot and watch turnout
  So that members vote on a final ballot and nobody can change it mid-vote

  Phase 4 of docs/election-management-plan.md, behind enableElectionManagement.

  @P0 @critical
  Scenario: An admin settles the empty positions and locks the ballot
    Given there is an election whose nominations have closed, with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I open the election's "Ballot" tab
    Then I should see "No candidates for: Secretary, Treasurer. Mark them vacant or extend nominations."
    When I mark "Secretary" vacant
    And I mark "Treasurer" vacant
    And I lock the ballot
    Then I should see the message "Ballot locked."
    And the election's status should be "ballot_locked"
    And the position "Secretary" should be "vacant"
    And the election's activity should show "Locked the ballot"

  @P1
  Scenario: An admin extends nominations with a reason
    Given there is an election whose nominations have closed, with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I extend nominations by a day because "No one stood for Treasurer"
    Then I should see the message "Nominations extended."
    And the election's nominations should close a day later
    And the election's activity should show "Extended nominations" with the reason "No one stood for Treasurer"

  @P0 @critical
  Scenario: An admin sees turnout as counts only
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Zara"
    And "Zara" has voted for "Hani"
    And I am signed in as an admin
    Then the turnout should show "1 (" voted for candidates
    And I should not see "Hani 1"

  @P1
  Scenario: An admin extends voting with a reason
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I extend voting by a day because "The website was down for an evening"
    Then I should see the message "Voting extended."
    And the election's voting should close a day later

  @P0 @critical
  Scenario: A candidate withdrawn after the lock stays on the ballot but can't be chosen
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I mark "Nazir" withdrawn because "Moved out of state"
    Then I should see the message "Candidate marked withdrawn."
    And "Nazir" should be marked withdrawn
    When I sign in instead as an approved member
    And I open the election
    Then I should see "Withdrawn: can’t be chosen"
    And I shouldn't be able to choose "Nazir"

  @P0 @critical
  Scenario: A member chooses up to as many candidates as there are seats
    Given there is an open election with candidates "Amina", "Bilal" and "Karim" for "Director" with 2 seats
    And I am signed in as an approved member
    When I open the election
    Then I should see "Choose up to 2."
    When I vote for "Amina" and "Bilal"
    Then my votes for "Amina" and "Bilal" should be recorded

  @P0 @security @api
  Scenario: The server refuses more choices than seats
    Given there is an open election with candidates "Amina", "Bilal" and "Karim" for "Director" with 2 seats
    And there is an approved member named "Zara"
    When "Zara" votes for "Amina", "Bilal" and "Karim" through the vote API
    Then the vote should be refused with "Choose up to 2 candidates for Director"

  @P1
  Scenario: A member who isn't on the voter roll is told why there's no ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    And "Me approved" isn't on the voter roll
    When I open the election
    Then I should see "You aren’t on the voter roll for this election"
    And I should not see a "Review votes" button

  @P0 @security @api
  Scenario: A member can't mark a candidate withdrawn
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    When "Bilal" withdraws candidate "Nazir" through the public API
    Then the call should be refused with "Only admins"

  @P2 @a11y @mobile
  Scenario: The Ballot and Voting tabs have no serious accessibility problems and fit a phone
    Given there is an election whose nominations have closed, with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I open the election's "Ballot" tab
    Then an accessibility scan should find no serious problems
    And the page should fit the screen width
