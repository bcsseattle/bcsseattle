@elections
Feature: Standing for election and seeing the results
  As an approved BCS Seattle member
  I want to nominate myself while nominations are open and see the results afterwards
  So that I can stand for a role and trust the outcome

  @P1
  Scenario: An approved member nominates themselves while nominations are open
    Given there is an election accepting nominations
    And I am signed in as an approved member
    When I nominate myself for "Treasurer" with the platform "Transparent budgets and a quarterly report to every member."
    Then I should see the message "Success!"
    And I should be listed as a candidate for "Treasurer"

  @P1
  Scenario: A member who already stood is told so instead of seeing the form again
    Given there is an election accepting nominations
    And I am signed in as an approved member
    And I have already nominated myself for "President"
    When I open the nomination page
    Then I should see "Already Nominated"

  @P1 @security @BUG-006
  Scenario: Nominations are refused outside the nomination period
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I nominate myself for "Treasurer" with the platform "Transparent budgets and a quarterly report to every member."
    Then I should not be listed as a candidate

  @P1
  Scenario: A member sees the vote totals of a finished election
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an approved member
    When I open the election results
    And I open the "Leadership Results" tab
    Then I should see "3 total votes cast"
    And I should see "66.67%"

  @P1 @api @BUG-037
  Scenario: Each candidate's share is worked out within their own position
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And "Sara" is the only candidate for "Treasurer" and received 3 votes
    And I am signed in as an approved member
    When I fetch the published results of the election
    Then "Hani" should have 66.67 percent of the "President" vote

  @P1 @api @BUG-037
  Scenario: A draft election's results aren't published
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And the election is still a draft
    And I am signed in as an approved member
    When I fetch the published results of the election
    Then the results should not be found

  @P1 @api @BUG-037
  Scenario: Election results need a signed-in member
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And I am a visitor who is not signed in
    When I fetch the published results of the election
    Then the results should need sign-in

  # The tally route counts with the service role since the BUG-019 fix, so it
  # must not reveal counts while candidate voting is still open.
  @P1 @api @security @BUG-019
  Scenario: Vote counts are not available while voting is open
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an approved member
    When I fetch the candidate results as a member
    Then the request should be refused

  @P1 @api @BUG-019
  Scenario: A member can see each candidate's real vote count
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an approved member
    When I fetch the candidate results as a member
    Then "Hani" should have 2 votes

  @P2 @BUG-045
  Scenario: The results page picks up other members' votes while it's open
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an approved member
    And the page's clock is under the test's control
    When I open the election results
    And I open the "Leadership Results" tab
    Then I should see "3 total votes cast"
    When another member votes for "Nazir"
    And 15 seconds pass
    Then I should see "4 total votes cast"
