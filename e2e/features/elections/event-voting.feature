@elections
Feature: Voting at an event
  As a member at a BCS Seattle event
  I want to scan a QR code and vote on my phone
  So that I can vote without remembering my password

  Behind enableEventVoting, turned on by a row in feature_flags. Members enter
  their email at /vote/<election> and sign in with the code we email them.

  Background:
    Given event voting is turned on

  @P0 @critical
  Scenario: A member on the voter roll scans the code, signs in with an email code and votes
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is an approved member named "Bilal"
    When "Bilal" asks for a ballot code at the event
    And "Bilal" enters the code from the email
    And I vote for "Hani" as "President"
    Then my vote for "Hani" should be recorded

  @P0 @critical
  Scenario: Someone not on the voter roll is told the same thing and gets no code
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And event voting is open for the election
    And there is a pending applicant named "Pat"
    When "Pat" asks for a ballot code at the event
    Then I should see "Check your email"
    And "Pat" should not have been sent a code

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
