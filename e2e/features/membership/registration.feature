@membership
Feature: Membership registration
  As a Washington resident with a BCS Seattle account
  I want to apply for membership
  So that an admin can approve me and I can take part in the community

  @P0 @smoke @critical
  Scenario: A Washington resident applies for individual membership
    Given I am signed in as a user with no membership
    When I register as an individual member living in Seattle, WA
    Then I should be on the membership fee page
    And I should see "You have successfully registered as a member."
    And my membership application should be awaiting admin approval

  @P0 @critical
  Scenario: A brand-new account can complete registration straight after signing up
    Given I am a visitor who is not signed in
    When I sign up with a new email address and the password "a-strong-password"
    And I register as an individual member living in Seattle, WA
    Then I should be on the membership fee page
    And my membership application should be awaiting admin approval

  @P1
  Scenario Outline: Registration requires <field>
    Given I am signed in as a user with no membership
    When I submit the registration form without a "<field>"
    Then I should see "<message>"
    And I should be on the registration page

    Examples:
      | field   | message                  |
      | Name    | Name is required         |
      | Phone   | Phone number is required |
      | Address | Street address, P.O. box |
      | City    | City is required         |
      | Zip     | Zip code is required     |

  @P1
  Scenario: The application can't be sent until the terms are accepted
    Given I am signed in as a user with no membership
    When I go to "/register"
    Then the "Register as member" button should be disabled
    When I accept the terms and conditions
    Then the "Register as member" button should be enabled

  @P2
  Scenario: Family membership asks how many family members are joining
    Given I am signed in as a user with no membership
    When I go to "/register"
    And I choose the "Family" membership type
    Then I should see "Total Members in Family"

  @P1 @BUG-034
  Scenario: The server refuses a registration without a name, even if the browser sends one
    Given I am signed in as a user with no membership
    When I register but my browser sends the form without a name
    Then I should see the message "Name is required"
    And no membership should have been created for me

  @P1 @BUG-034
  Scenario: Resubmitting the form doesn't undo an approved membership
    Given I am signed in as an approved member
    When I submit my registration form again
    Then I should still be an approved member
