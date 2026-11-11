@access @security @api @elections
Feature: Only admins run elections, and a locked ballot stays locked
  As BCS Seattle
  I want every election decision checked in the database, not only on the page
  So that nobody can change an election, its ballot or its votes from a browser console

  These scenarios call Supabase directly with the caller's own login, as the
  election management plan requires (docs/election-management-plan.md §8).

  @P0 @critical
  Scenario: Members can't see a draft election
    Given there is an upcoming election with candidates "Hani" and "Nazir" for "President"
    And the election is still a draft
    And there is an approved member named "Bilal"
    When "Bilal" looks up the election through the public API
    Then no record should be returned

  @P0 @critical
  Scenario Outline: A member can't call <function>
    Given there is an <window> election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    When "Bilal" calls "<function>" on the election through the public API
    Then the call should be refused with "Only admins"
    And the election status should still be "<status>"

    Examples:
      | function                | window      | status        |
      | election_publish        | upcoming    | ballot_locked |
      | election_lock_ballot    | nominations | scheduled     |
      | election_extend         | open        | ballot_locked |
      | election_cancel         | open        | ballot_locked |
      | election_publish_results| closed      | completed     |
      | election_archive        | closed      | completed     |
      | election_turnout        | open        | ballot_locked |

  @P0 @critical
  Scenario: A member can't change an election's status directly
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    When "Bilal" sets the election's status to "completed" through the public API
    Then the election status should still be "ballot_locked"

  @P0 @critical
  Scenario: Even an admin can't change a locked ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an admin named "Ayaan"
    When "Ayaan" adds the candidate "Late" for "President" through the public API
    Then the call should be refused with "locked"

  @P0 @critical
  Scenario: An admin standing in an election can't run it
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an admin named "Ayaan"
    And "Ayaan" is standing as "Hani"
    When "Ayaan" calls "election_cancel" on the election through the public API
    Then the call should be refused with "standing in this election"
    And the election status should still be "ballot_locked"

  @P0 @critical
  Scenario: Turnout gives counts only
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Zara"
    And "Zara" has voted for "Hani"
    And there is an admin named "Ayaan"
    When "Ayaan" asks for the election's turnout through the public API
    Then the turnout should show 1 candidate voter and nothing about who voted for whom

  @P0 @critical
  Scenario: Not even an admin can read someone else's votes
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Zara"
    And "Zara" has voted for "Hani"
    And there is an admin named "Ayaan"
    When "Ayaan" reads the election's votes through the public API
    Then no record should be returned

  @P0 @critical
  Scenario: A member who isn't on the voter roll can't open a ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    And "Bilal" isn't on the voter roll
    When "Bilal" opens a candidate ballot through the public API
    Then no ballot session should exist for "Bilal"

  @P0 @critical
  Scenario: Nominations can't be written directly
    Given there is an election accepting nominations
    And there is an approved member named "Bilal"
    When "Bilal" nominates themselves for "President" directly through the public API
    Then no nomination should exist for "Bilal"

  @P1
  Scenario: Members can't read the election activity log
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    When "Bilal" reads the election's activity through the public API
    Then no record should be returned
