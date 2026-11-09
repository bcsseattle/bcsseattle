@auth
Feature: Creating an account and managing passwords
  As someone who wants to join BCS Seattle
  I want to create an account and recover it if I forget my password
  So that I can apply for membership and keep access

  @P0 @smoke @critical
  Scenario: A newcomer creates an account and is taken to membership registration
    Given I am a visitor who is not signed in
    When I sign up with a new email address and the password "a-strong-password"
    Then I should be on the registration page
    And I should see the message "Success!"
    And an account should exist for my new email address

  @P1
  Scenario: Signing up with an email that already has an account is refused
    Given there is an approved member named "Amina"
    When I sign up again with "Amina"'s email address
    Then I should be on the "/signin/signup" page
    And I should see the message "Sign up failed."

  @P1
  Scenario: A member who forgot their password is emailed a reset link
    Given there is an approved member named "Amina"
    When "Amina" asks for a password reset
    Then I should see "Please check your email for a password reset link"
    And "Amina" should receive a password reset email

  @P1 @security @known-bug @BUG-029
  Scenario: A new password is not saved when the confirmation doesn't match
    Given I am signed in as an approved member
    When I change my password to "new-password-1" confirmed as "different-password-2"
    Then my password should still be the original one
