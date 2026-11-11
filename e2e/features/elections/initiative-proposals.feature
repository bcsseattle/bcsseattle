@elections @proposals
Feature: Members propose initiative questions
  As BCS Seattle members and admins
  We want members to propose questions for the ballot while nominations are open,
  and admins to approve or reject each one before the ballot is locked
  So that members can put the issues they care about to a vote

  Decided 13 Nov 2026 (docs/election-management-plan.md B17-B20): admins approve,
  during the nominations window, no co-sponsors, up to 3 per member per election.

  @P0 @critical
  Scenario: A member proposes an initiative, starting from an example
    Given there is an election accepting nominations
    And I am signed in as an approved member
    When I propose the example "Should BCS hold a cultural festival each summer that is open to the public?"
    Then I should see the message "Initiative proposed."
    And the initiative "Should BCS hold a cultural festival each summer that is open to the public?" should be waiting for review
    And I should see "Your initiative is waiting for review"

  @P0 @critical
  Scenario: An admin approves a proposal and it goes on the ballot
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And "Zara" has proposed the initiative "Should BCS start a weekend Bangla school?", waiting for review
    And I am signed in as an admin
    When I approve the initiative "Should BCS start a weekend Bangla school?"
    Then I should see the message "Initiative approved."
    And the initiative "Should BCS start a weekend Bangla school?" should be on the ballot
    And the ballot should include the initiative "Should BCS start a weekend Bangla school?"

  @P0 @critical
  Scenario: An admin rejects a proposal and the member sees why
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And "Zara" has proposed the initiative "Should BCS buy a building?", waiting for review
    And I am signed in as an admin
    When I reject the initiative "Should BCS buy a building?" because "Too costly to put to a vote this year"
    Then I should see the message "Initiative not approved."
    And the ballot should not include the initiative "Should BCS buy a building?"
    When I sign in instead as "Zara"
    And I open the election
    Then I should see "Too costly to put to a vote this year"

  @P1
  Scenario: A member withdraws an approved proposal and it leaves the ballot
    Given there is an election accepting nominations
    And I am signed in as an approved member
    When I propose the initiative "Should BCS start a monthly newsletter?" explained as "A short email each month with news, events and the board's decisions."
    And there is an admin named "Ayaan"
    And "Ayaan" approves the initiative "Should BCS start a monthly newsletter?" through the public API
    And I withdraw my initiative "Should BCS start a monthly newsletter?"
    Then I should see the message "Proposal withdrawn."
    And the initiative "Should BCS start a monthly newsletter?" should be withdrawn
    And the ballot should not include the initiative "Should BCS start a monthly newsletter?"

  @P1 @api
  Scenario: A member can propose up to 3 initiatives in an election
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And "Zara" has proposed 3 initiatives
    When "Zara" proposes an initiative through the public API
    Then the call should be refused with "up to 3"

  @P1 @api
  Scenario: Proposals close with nominations
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Zara"
    When "Zara" proposes an initiative through the public API
    Then the call should be refused with "aren't open"

  @P0 @security @api
  Scenario: Proposals go through review, and members see only their own
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is an approved member named "Bilal"
    And "Zara" has proposed the initiative "Should BCS start a weekend Bangla school?"
    When "Bilal" adds a proposal directly through the public API
    Then the call should be refused
    And "Bilal" should see no initiative proposals through the public API

  @P0 @api
  Scenario: The ballot can't be locked while a proposal waits for review
    Given there is an election whose nominations have closed, with the initiative "Should BCS plant a community garden?"
    And there is an approved member named "Zara"
    And "Zara" has proposed the initiative "Should BCS start a weekend Bangla school?", waiting for review
    And there is an admin named "Ayaan"
    When "Ayaan" calls "election_lock_ballot" on the election through the public API
    Then the call should be refused with "initiative proposals"
    And the election status should still be "scheduled"

  @P2 @a11y @mobile
  Scenario: The propose page has no serious accessibility problems and fits a phone
    Given there is an election accepting nominations
    And I am signed in as an approved member
    Then the propose page should have no serious accessibility problems and fit the screen
