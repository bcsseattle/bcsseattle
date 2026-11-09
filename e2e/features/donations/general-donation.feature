@donations @payments
Feature: General donations
  As a supporter of BCS Seattle
  I want to donate by card, bank transfer, Zelle, check or cash
  So that I can fund the community's work and get a receipt

  The suite stops at Stripe's hosted Checkout page and then plays Stripe's part
  by posting a signed checkout.session.completed event to the webhook.

  @P0 @smoke @critical
  Scenario: A member starts a one-time $100 card donation
    Given I am signed in as an approved member
    When I donate $100 once by card
    Then I should be taken to Stripe Checkout for $100.00 as a one-time payment
    And a pending $100.00 donation should be recorded for my email

  @P0 @critical @BUG-013
  Scenario: Changing the amount in the browser doesn't change what is charged
    Given I am signed in as an approved member
    When I donate $100 once by card but my browser asks checkout to charge $1
    Then I should be taken to Stripe Checkout for $100.00 as a one-time payment
    And a pending $100.00 donation should be recorded for my email

  @P0 @critical
  Scenario: Once Stripe confirms the payment, the donor gets a receipt
    Given I am signed in as an approved member
    And I have started a one-time $100 card donation
    When Stripe confirms the payment for my donation
    Then my donation should be marked as completed
    When I open the receipt for my donation
    Then I should see "Donation Amount: $100"
    And I should see "Thank you for your support!"
    And the receipt PDF should download

  @P1
  Scenario: A monthly donation is set up as a subscription
    Given I am signed in as an approved member
    When I donate $100 monthly by card
    Then I should be taken to Stripe Checkout for $100.00 as a subscription

  @P1
  Scenario Outline: Donor details are checked before moving on to payment
    Given I am a visitor who is not signed in
    When I enter my donor details with email "<email>" and phone "<phone>"
    Then I should see "<message>"
    And I should not see "Payment Method"

    Examples:
      | email              | phone        | message                    |
      | not-an-email       | 206-555-0100 | Invalid email address      |
      | donor@example.test | call me      | Phone number must be valid |

  @P1 @BUG-014
  Scenario: A custom amount with cents can be donated
    Given I am signed in as an approved member
    When I donate a custom amount of $19.99 once by card
    Then I should be taken to Stripe Checkout for $19.99 as a one-time payment

  # Today "Done" calls Stripe with payment_method_types ['zelle'], Stripe rejects
  # it server-side, and the donor sees nothing happen (no toast, still on the step).
  # "Finished" = the wizard leaves the payment step; the exact confirmation UI is
  # not specified anywhere (PRD §3.3), so the scenario asserts only that.
  @P1 @BUG-018
  Scenario: Choosing Zelle and pressing Done finishes the donation without a card payment
    Given I am signed in as an approved member
    When I choose to donate $100 by Zelle and finish
    Then I should still be on the BCS Seattle site
    And the donation form should be finished

  @P1 @BUG-026
  Scenario: A guest donor can open their own receipt without an account
    Given a completed $50 donation by a guest donor
    And I am a visitor who is not signed in
    When I open the receipt for that donation
    Then I should see "Donation Amount: $50"

  @P1 @known-bug @BUG-042
  Scenario: No receipt is issued for a donation that was never paid
    Given a pending $50 donation by a guest donor
    And I am signed in as an approved member
    When I open the receipt for that donation
    Then I should not see "Donation Receipt"

  @P0 @critical @BUG-073
  Scenario: A first-time guest can start a card donation
    Given I am a visitor who is not signed in
    When I donate $100 once by card
    Then I should be taken to Stripe Checkout for $100.00 as a one-time payment
