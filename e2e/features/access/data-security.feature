@access @security @api
Feature: Personal data is protected at the database and API level
  As BCS Seattle
  I want the public API key and open endpoints to expose nothing they shouldn't
  So that nobody can read members' data or change their own permissions from a browser console

  These scenarios call Supabase and the app's HTTP endpoints directly, as an
  attacker with only the public (anon) key and their own login would.

  @P0 @critical
  Scenario: A user cannot read another user's account record
    Given there is an approved member named "Amina"
    And there is an approved member named "Bilal"
    When "Bilal" reads the account record of "Amina" through the public API
    Then no record should be returned

  @P0 @BUG-001
  Scenario: A user cannot make themselves an admin
    Given there is an approved member named "Bilal"
    When "Bilal" sets their own account to admin through the public API
    Then "Bilal" should not be an admin

  @P0 @BUG-002
  Scenario: An applicant cannot approve their own membership
    Given there is a pending applicant named "Bilal"
    When "Bilal" marks their own membership as approved through the public API
    Then "Bilal"'s membership should still be awaiting approval

  @P0 @BUG-003
  Scenario Outline: Someone who isn't signed in cannot read <table>
    Given there is an approved member named "Amina"
    And "Amina" has made a donation
    When an anonymous visitor reads the "<table>" table through the public API
    Then no record should be returned

    Examples:
      | table     |
      | members   |
      | donors    |
      | donations |

  # Community transparency (confirmed 2026-11-08): approved members see every
  # donation, members' and guests', and who gave it, except donations marked
  # private and the identity of donors who gave anonymously.
  @P0 @api
  Scenario: An approved member can see a guest's donation and who gave it
    Given a guest named "Farah" has donated $50
    And there is an approved member named "Bilal"
    When "Bilal" reads that donation through the public API
    Then they should see the $50 donation from that guest

  @P0 @api
  Scenario: An anonymous gift is visible to members without its donor
    Given a guest named "Farah" has donated $50 anonymously
    And there is an approved member named "Bilal"
    When "Bilal" reads that donation through the public API
    Then they should see the $50 donation but not who gave it

  @P0 @api
  Scenario: A private donation is hidden from members
    Given a guest named "Farah" has made a private $50 donation
    And there is an approved member named "Bilal"
    When "Bilal" reads that donation through the public API
    Then they should not see that donation

  @P0 @api
  Scenario: Someone without an approved membership cannot see other people's donations
    Given a guest named "Farah" has donated $50
    And there is a user with no membership named "Bilal"
    When "Bilal" reads that donation through the public API
    Then they should not see that donation

  @P0 @api @BUG-079
  Scenario: Nobody can record a paid fundraiser donation through the public API
    Given there is an active fundraiser "Help the Rahimi family" with a goal of $1,000
    When an anonymous visitor records a paid $500 donation to the fundraiser through the public API
    Then the fundraiser's total should be $0

  @P0 @api @BUG-080
  Scenario: Someone who isn't signed in cannot read fundraiser donors' contact details
    Given a guest has left their contact details with a fundraiser donation
    When an anonymous visitor reads the "fundraiser_donors" table through the public API
    Then no record should be returned

  @P1 @BUG-030
  Scenario: Donating with someone else's email doesn't change their saved details
    Given there is an active fundraiser "Roof repair" with a goal of $2,000
    And a guest has left their contact details with a fundraiser donation
    And I am signed in as an approved member
    When someone donates to the fundraiser with that guest's email as "Mallory" with phone "+12065550000"
    Then the guest's saved name and phone should be unchanged

  @P0 @BUG-005
  Scenario: A member cannot record a vote directly, bypassing the ballot
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    When "Bilal" inserts a vote for "Hani" directly through the public API
    Then the vote should be rejected

  @P0 @BUG-008
  Scenario: An anonymous caller cannot make the site send a "payment failed" email
    When an anonymous caller asks the site to send a payment-failed email to "victim@example.test"
    Then the request should be refused before any email is attempted

  @P1 @BUG-033
  Scenario: Only admins can run the voting security report
    Given I am signed in as an approved member
    When I request the voting security report
    Then the request should be refused

  @P1 @BUG-033
  Scenario: An admin can run the voting security report
    Given I am signed in as an admin
    When I request the voting security report
    Then I should get the voting security report

  @P0 @api @BUG-033
  Scenario Outline: Voter-level database functions can't be called with the public key
    When an anonymous visitor calls the "<function>" database function
    Then the call should be refused

    Examples:
      | function                 |
      | find_duplicate_votes     |
      | find_invalid_votes       |
      | find_orphaned_votes      |
      | check_unique_constraints |

  @P0 @api @BUG-046
  Scenario: A member cannot create an election through the public API
    Given there is an approved member named "Bilal"
    When "Bilal" creates an election through the public API
    Then no election should have been created

  @P0 @api @BUG-046
  Scenario: A candidate cannot withdraw once the ballot is locked, so votes for them stay
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    And there is an approved member named "Zara"
    And "Bilal" is standing as "Hani"
    And "Zara" has voted for "Hani"
    When "Bilal" withdraws as "Hani" through the public API
    Then "Hani" should still be on the ballot
    And the vote for "Hani" should still be counted

  @P1 @api @BUG-046
  Scenario: A candidate can withdraw before the ballot is locked
    Given there is a nominations election with candidates "Hani" and "Nazir" for "President"
    And there is an approved member named "Bilal"
    And "Bilal" is standing as "Hani"
    When "Bilal" withdraws as "Hani" through the public API
    Then "Hani" should no longer be on the ballot
