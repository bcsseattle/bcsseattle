@auth
Feature: Signing in and out
  As a BCS Seattle member
  I want to sign in with my email and password
  So that I can reach the member-only parts of the site

  @P0 @smoke @critical
  Scenario: An approved member signs in with valid credentials
    Given there is an approved member named "Amina"
    When "Amina" signs in with the correct password
    Then I should be on the home page
    And I should see the message "Success!"
    And the navigation should offer the "Membership" menu

  @P0 @smoke
  Scenario: Signing in with the wrong password is rejected
    Given there is an approved member named "Amina"
    When "Amina" signs in with the password "not-the-password"
    Then I should still be on the sign-in page
    And I should see the message "Sign in failed."
    And I should see "Invalid login credentials"

  @P0 @critical
  Scenario: A member returns to the page they asked for after signing in
    Given there is an approved member named "Amina"
    When I go to "/account"
    Then I should be asked to sign in before reaching "/account"
    When "Amina" signs in with the correct password
    Then I should be on the "/account" page
    And I should see the heading "Account Settings"

  @P1
  Scenario: A signed-in member signs out
    Given I am signed in as an approved member
    When I sign out
    Then I should be on the sign-in page
    And the navigation should offer the "For members" link

  # The form path is safe today (client-side router.push stays on-site); the
  # server-side redirect in the next scenario is where BUG-032 bites.
  @P1 @security
  Scenario: Signing in never sends the member to another website
    Given there is an approved member named "Amina"
    When "Amina" signs in from a link that asks to return to "//evil.example"
    Then I should still be on the BCS Seattle site

  @P1 @security @BUG-032
  Scenario: A signed-in member following a crafted sign-in link stays on the site
    Given I am signed in as an approved member
    When I open a sign-in link that asks to return to "//evil.example"
    Then I should still be on the BCS Seattle site
