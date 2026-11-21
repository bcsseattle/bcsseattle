@elections
Feature: Voting at an event
  As someone at a BCS Seattle event
  I want to scan a QR code and vote on my phone
  So that I can vote there, member or not

  Behind allowGuestVoting, turned on by a row in feature_flags. Anyone enters
  their email at /vote/<election> and signs in with the code we email them
  (an account is made if they have none). Each account votes once.

  Background:
    Given event voting is turned on

  @P0 @critical
  Scenario: A member scans the code, signs in with an email code and votes
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is an approved member named "Bilal"
    When "Bilal" asks for a ballot code at the event
    And "Bilal" enters the code from the email
    And I vote for "Hani" as "President"
    Then my vote for "Hani" should be recorded

  @P0 @critical
  Scenario: Someone whose membership isn't approved votes at the event
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is a pending applicant named "Pat"
    When "Pat" asks for a ballot code at the event
    And "Pat" enters the code from the email
    And I vote for "Nazir" as "President"
    Then my vote for "Nazir" should be recorded

  @P0 @critical
  Scenario: Someone with no account votes at the event
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And "Gul" has no BCS account
    When "Gul" asks for a ballot code at the event
    And "Gul" enters the code from the email
    And I vote for "Hani" as "President"
    Then my vote for "Hani" should be recorded

  @P0 @critical
  Scenario: Someone who already voted online can't vote again at the event
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is an approved member named "Bilal"
    And "Bilal" has already voted for "Hani"
    When "Bilal" asks for a ballot code at the event
    And "Bilal" enters the code from the email
    And I open the candidate ballot
    Then I should see "Candidate Votes Already Submitted"
    And my vote for "Hani" should be recorded

  @P1
  Scenario: Once event voting closes, someone who joined the roll there can't vote
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is a pending applicant named "Pat"
    And "Pat" asks for a ballot code at the event
    And "Pat" enters the code from the email
    When event voting is closed for the election
    And I open the candidate ballot
    Then I should not be offered a ballot

  @P1
  Scenario: The QR code opens no ballot until an admin opens event voting
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    When I open the event voting page
    Then I should see "Voting at this event isn’t open"

  @P1
  Scenario: An admin opens event voting and gets the QR code
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I open event voting from the election's Voting tab
    Then I should see the message "Event voting is open."
    And I should see the event QR code
