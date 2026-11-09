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

  @P1 @security @known-bug @BUG-006
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

  @P1 @api @known-bug @BUG-037
  Scenario: Each candidate's share is worked out within their own position
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And "Sara" is the only candidate for "Treasurer" and received 3 votes
    When I fetch the published results of the election
    Then "Hani" should have 66.67 percent of the "President" vote

  @P1 @api @known-bug @BUG-019
  Scenario: A member can see each candidate's real vote count
    Given there is a closed election with candidates "Hani" and "Nazir" for "President"
    And "Hani" received 2 votes and "Nazir" received 1 vote
    And I am signed in as an approved member
    When I fetch the candidate results as a member
    Then "Hani" should have 2 votes
