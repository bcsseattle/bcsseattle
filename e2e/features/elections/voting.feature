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
    Then I should see the election status "Voting open"
    And I should see a "Review votes" button

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

  @P0 @critical @BUG-007
  Scenario: Someone whose membership isn't approved can't vote
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as a pending applicant
    When I open the candidate ballot
    Then I should not be offered a ballot

  @P1 @BUG-015
  Scenario Outline: A <window> election says "<status>" and offers no ballot
    Given there is a <window> election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I open the election
    Then I should see the election status "<status>"
    And I should not see a "Review votes" button

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

  @P1 @W8
  Scenario: After voting on the election page's ballot, the page shows the votes, not the ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I submit the combined ballot with a vote for "Hani"
    And I open the election
    Then I should see "Your leadership votes"
    And I should see "Hani"
    And I should not see a "Review votes" button

  @P1 @BUG-052
  Scenario: An initiative vote on the combined ballot is recorded
    Given there is an open election with the initiative "Build a community garden"
    And I am signed in as an approved member
    When I vote "No / Oppose" on "Build a community garden" using the combined ballot
    Then my "no" vote on "Build a community garden" should be recorded

  @P2 @BUG-059
  Scenario: A leadership election is marked "Leadership" in the elections list
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I go to "/elections"
    Then the elections list should mark the election as "Leadership"

  @P1
  Scenario: A closed election is listed under Past, with its results
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I go to "/elections"
    And I open the "Past" tab
    And I follow the election's "Results" link
    Then I should be on the election results

  @P1 @api @BUG-060
  Scenario: Candidate voting doesn't open before its own start date
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And candidate voting for the election only starts tomorrow
    And I am signed in as an approved member
    When I submit the candidate ballot with a vote for "Hani"
    Then the ballot should be refused as not open yet

  @P0 @security @api @BUG-016
  Scenario: A member who voted on the combined ballot can't vote again on the candidate ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I submit the combined ballot with a vote for "Hani"
    And I submit the candidate ballot with a vote for "Nazir"
    Then the ballot should be refused as already voted
    And only my vote for "Hani" should be counted

  @P1 @security @api @BUG-011
  Scenario: The ballot refuses two votes in one position, however they're labelled
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I submit a ballot for both "Hani" and "Nazir", labelling one with another position
    Then no votes should be recorded for the election

  @P1 @security @BUG-020
  Scenario: A URL parameter can't switch off the membership check in production
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as a pending applicant
    When I open the elections list with a feature override that skips the membership check
    Then I should not see "Current and Upcoming Elections"
