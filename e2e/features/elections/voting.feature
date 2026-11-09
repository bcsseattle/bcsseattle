@elections
Feature: Voting in member elections
  As an approved BCS Seattle member
  I want to vote for candidates and on ballot initiatives
  So that I have a say in who leads the community and what it does

  @P0 @smoke @critical
  Scenario: An approved member finds an open election ready to vote in
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I open the election
    Then I should see the election status "Voting Open"
    And I should see a "Vote for Candidates" button

  @P0 @smoke @critical
  Scenario: An approved member votes for a candidate and gets a confirmation code
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I vote for "Hani" as "President"
    Then I should see "Candidate Votes Confirmed"
    And I should be given a confirmation code
    And my vote for "Hani" should be recorded

  @P0 @critical
  Scenario: A member can't vote twice for candidates in the same election
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    And I have already voted for "Hani"
    When I open the candidate ballot
    Then I should see "Candidate Votes Already Submitted"

  @P0 @critical
  Scenario: An approved member votes yes on a ballot initiative
    Given there is an open election with the initiative "Build a community center"
    And I am signed in as an approved member
    When I vote "Yes / Support" on "Build a community center"
    Then I should see "Initiative Votes Confirmed"
    And my "yes" vote on "Build a community center" should be recorded

  @P0 @critical @known-bug @BUG-007
  Scenario: Someone whose membership isn't approved can't vote
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as a pending applicant
    When I open the candidate ballot
    Then I should not be offered a ballot

  @P1 @known-bug @BUG-015
  Scenario Outline: A <window> election says "<status>" and offers no ballot
    Given there is a <window> election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I open the election
    Then I should see the election status "<status>"
    And I should not see a "Vote for Candidates" button

    Examples:
      | window   | status    |
      | closed   | Completed |
      | upcoming | Upcoming  |

  # Votes are written only by the server since the BUG-005 fix; this covers the
  # combined ballot (components/elections/voting-client.tsx), which has no session.
  @P0 @api @BUG-005
  Scenario: The combined ballot records a member's vote
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I submit the combined ballot with a vote for "Hani"
    Then my vote for "Hani" should be recorded

  @P1 @security @api @known-bug @BUG-011
  Scenario: The ballot refuses two votes in one position, however they're labelled
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I submit a ballot for both "Hani" and "Nazir", labelling one with another position
    Then no votes should be recorded for the election

  @P1 @security @known-bug @BUG-020
  Scenario: A URL parameter can't switch off the membership check in production
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as a pending applicant
    When I open the elections list with a feature override that skips the membership check
    Then I should not see "Current and Upcoming Elections"
