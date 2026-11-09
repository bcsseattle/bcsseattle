@payments @api @security
Feature: The Stripe webhook only trusts Stripe
  As BCS Seattle
  I want payment notifications to be accepted only when Stripe really sent them
  So that nobody can mark a donation as paid by calling the endpoint themselves

  @P0 @critical
  Scenario: A notification without Stripe's signature is rejected
    Given a pending $50 donation by a guest donor
    When someone posts a "checkout.session.completed" notification for the donation without a signature
    Then the webhook should answer 400
    And the donation should still be pending

  @P0 @critical
  Scenario: A notification signed with the wrong secret is rejected
    Given a pending $50 donation by a guest donor
    When someone posts a "checkout.session.completed" notification for the donation with a forged signature
    Then the webhook should answer 400
    And the donation should still be pending

  @P1 @BUG-041
  Scenario: An event the site doesn't handle is acknowledged, so Stripe stops retrying it
    When Stripe sends a signed "customer.created" notification
    Then the webhook should answer with success

  @P0 @critical @BUG-041
  Scenario: A bank payment counts only once it settles
    Given a pending $50 donation by a guest donor
    When Stripe reports the bank payment for the donation as started
    Then the donation should be pending
    When Stripe reports the bank payment for the donation as settled
    Then the donation should be completed

  @P1 @BUG-041
  Scenario: A bank payment that fails is marked failed
    Given a pending $50 donation by a guest donor
    When Stripe reports the bank payment for the donation as started
    And Stripe reports the bank payment for the donation as failed
    Then the donation should be failed
