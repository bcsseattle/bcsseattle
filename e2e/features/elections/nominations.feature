@elections @nominations
Feature: Nominating, answering and reviewing nominations
  As BCS Seattle members and admins
  We want members to nominate themselves or each other, nominees to accept or
  decline, and admins to review before the ballot is locked
  So that only candidates who agreed to stand, and who were approved, are on the ballot

  The flow behind enableElectionManagement (docs/election-management-plan.md, Phase 3).

  @P0 @critical
  Scenario: A member nominates another member, who accepts
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And I am signed in as an approved member
    When I nominate "Zara" for "President" with the note "You’d be great at this"
    Then I should see the message "Nomination sent."
    And "Zara"'s nomination for "President" should be waiting for their answer
    When I sign in instead as "Zara"
    And I accept my nomination for "President" with the platform "A quarterly open meeting for every member."
    Then I should see the message "Nomination accepted."
    And my nomination for "President" should be waiting for review

  @P1
  Scenario: A nominee declines
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is a nomination of "Zara" for "Treasurer" waiting for their answer
    And I am signed in as "Zara"
    When I decline my nomination for "Treasurer"
    Then I should see the message "Nomination declined."
    And my nomination for "Treasurer" should be declined

  @P0 @critical
  Scenario: An admin approves a nomination and the nominee goes on the ballot
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is a nomination of "Zara" for "President" waiting for review
    And I am signed in as an admin
    When I approve "Zara"'s nomination
    Then I should see the message "Nomination approved."
    And "Zara" should be a candidate for "President"
    And "Zara"'s nomination for "President" should be on the ballot

  @P0 @critical
  Scenario: An admin rejects a nomination and the nominee sees why
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is a nomination of "Zara" for "President" waiting for review
    And I am signed in as an admin
    When I reject "Zara"'s nomination because "Joined after the cutoff date"
    Then I should see the message "Nomination not approved."
    And "Zara" should not be a candidate
    When I sign in instead as "Zara"
    And I go to "/account/nominations"
    Then I should see "Reason: Joined after the cutoff date"

  @P1
  Scenario: A candidate withdraws before the ballot is locked and leaves the ballot
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is a nomination of "Zara" for "President" on the ballot
    And I am signed in as "Zara"
    When I withdraw my nomination for "President"
    Then I should see the message "Nomination withdrawn."
    And "Zara" should not be a candidate

  @P1
  Scenario: An admin adds a candidate nominated at a meeting
    Given there is an election accepting nominations
    And I am signed in as an admin
    When I add "Karim Rind" as a candidate for "Secretary"
    Then I should see the message "Candidate added."
    And there should be a candidate named "Karim Rind" for "Secretary"

  @P1
  Scenario: An admin who nominated themselves can approve their own nomination
    Given there is an election accepting nominations
    And there is an admin named "Ayaan"
    And there is a nomination of "Ayaan" for "President" waiting for review
    And I am signed in as "Ayaan"
    When I approve "Ayaan"'s nomination
    Then I should see the message "Nomination approved."
    And "Ayaan" should be a candidate for "President"
    And "Ayaan"'s nomination for "President" should be on the ballot

  @P0 @security @api
  Scenario: A member can't approve a nomination
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is an approved member named "Bilal"
    And there is a nomination of "Zara" for "President" waiting for review
    When "Bilal" approves "Zara"'s nomination for "President" through the public API
    Then the call should be refused with "Only admins"
    And "Zara" should not be a candidate

  @P0 @security @api
  Scenario: A member can't accept someone else's nomination
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is an approved member named "Bilal"
    And there is a nomination of "Zara" for "President" waiting for their answer
    When "Bilal" accepts "Zara"'s nomination for "President" through the public API
    Then the call should be refused with "isn't for you"
    And "Zara"'s nomination for "President" should be waiting for their answer

  @P0 @security @api
  Scenario: Nobody can nominate once voting has opened
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Zara"
    And there is an approved member named "Bilal"
    When "Bilal" nominates "Zara" for "Treasurer" through the public API
    Then the call should be refused with "aren't open"

  @P2 @a11y @mobile
  Scenario: The nomination pages have no serious accessibility problems and fit a phone
    Given there is an election accepting nominations
    And there is an approved member named "Zara"
    And there is a nomination of "Zara" for "President" waiting for their answer
    And I am signed in as "Zara"
    Then each nomination page should have no serious accessibility problems and fit the screen
