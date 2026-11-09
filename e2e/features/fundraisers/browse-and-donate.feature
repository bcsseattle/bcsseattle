@fundraisers @payments
Feature: Supporting a fundraiser
  As a member of the BCS Seattle community
  I want to see active fundraisers and donate to them
  So that I can help a family or cause and see the progress made

  Fundraisers are on `develop` only: production has no fundraiser tables yet
  (see BUG-071). The e2e database adds them from develop's migrations.

  Background:
    Given there is an active fundraiser "Help the Rahimi family" with a goal of $1,000

  @P0 @smoke @critical
  Scenario: A member sees an active fundraiser and its progress
    Given I am signed in as an approved member
    When I go to the fundraisers page
    Then I should see the fundraiser "Help the Rahimi family" with "$0.00 raised" towards a "$1,000.00 goal"

  @P0 @critical
  Scenario: A member starts a $25 donation to a fundraiser
    Given I am signed in as an approved member
    When I donate $25 to the fundraiser
    Then I should be taken to Stripe Checkout for $25.00 for the fundraiser
    And a pending $25 fundraiser donation should be recorded

  @P0 @critical @BUG-013
  Scenario: Changing the amount in the browser doesn't change what the fundraiser charges
    Given I am signed in as an approved member
    When I donate $25 to the fundraiser but my browser asks checkout to charge $1
    Then I should be taken to Stripe Checkout for $25.00 for the fundraiser

  @P0 @critical
  Scenario: Once Stripe confirms the payment, the fundraiser's total goes up
    Given I am signed in as an approved member
    And I have started a $25 donation to the fundraiser
    When Stripe confirms the payment for my fundraiser donation
    And I open the fundraiser
    Then the fundraiser should show "$25.00" raised

  @P1 @payments @BUG-081
  Scenario: A donation with cents is accepted and counted in full
    Given I am signed in as an approved member
    When I donate $25.50 to the fundraiser
    Then I should be taken to Stripe Checkout for $25.50 for the fundraiser
    And a pending $25.50 fundraiser donation should be recorded
    When Stripe confirms the payment for my fundraiser donation
    Then the fundraiser's total should be $25.50

  @P1 @payments @BUG-012
  Scenario: A payment Stripe reports twice is only counted once
    Given I am signed in as an approved member
    And I have started a $25 donation to the fundraiser
    When Stripe confirms the payment for my fundraiser donation
    And Stripe sends the same confirmation again
    Then the fundraiser's total should be $25

  # BUGS.md suspected the donor wall would crash (BUG-039); on a full page load it renders fine.
  @P1
  Scenario: The donor wall thanks a donor once their payment completes
    Given I am signed in as an approved member
    And I have started a $25 donation to the fundraiser
    When Stripe confirms the payment for my fundraiser donation
    And I open the fundraiser
    Then the donor wall should list my donation

  @P0 @critical @BUG-074
  Scenario: A member opens a fundraiser from the list
    Given I am signed in as an approved member
    When I go to the fundraisers page
    And I open the fundraiser from the list
    Then I should see the fundraiser's title as the page heading

  @P1
  Scenario Outline: A donation of $<amount> is refused before payment
    Given I am signed in as an approved member
    When I try to donate $<amount> to the fundraiser
    Then the donation amount should be refused
    And I should not be taken to Stripe Checkout

    Examples:
      | amount  |
      | 0       |
      | 0.49    |
      | 1000000 |

  @P1 @BUG-043
  Scenario: The server refuses a donation below the minimum even if the browser allows it
    Given the fundraiser's minimum donation is $10
    And I am signed in as an approved member
    When I try to donate $25 to the fundraiser but my browser sends $5
    Then I should not be taken to Stripe Checkout
    And no donation should be recorded for the fundraiser

  @P1 @BUG-021
  Scenario: A visitor who isn't signed in can browse fundraisers
    Given I am a visitor who is not signed in
    When I go to the fundraisers page
    Then I should see the fundraiser "Help the Rahimi family" with "$0.00 raised" towards a "$1,000.00 goal"

  @P2 @known-bug @BUG-038
  Scenario: A fundraiser with no end date keeps accepting donations
    Given there is an active fundraiser "Ongoing zakat fund" with no end date
    And I am signed in as an approved member
    When I open the donation page of "Ongoing zakat fund"
    Then I should see the heading "Make a Donation"
