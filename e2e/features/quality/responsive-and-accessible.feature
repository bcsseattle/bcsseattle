@quality
Feature: The site works on phones and with assistive technology
  As a visitor on a phone, using a keyboard or a screen reader
  I want every page to be usable
  So that nobody in the community is shut out

  @P2 @mobile @known-bug @BUG-050
  Scenario Outline: <path> fits a phone screen without sideways scrolling
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then the page should fit the screen width

    Examples:
      | path      |
      | /         |
      | /donate   |
      | /about-us |

  @P2 @a11y
  Scenario Outline: <path> has no critical accessibility problems
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then an accessibility scan should find no critical problems

    Examples:
      | path                    |
      | /                       |
      | /signin/password_signin |
      | /donate                 |
      | /about-us               |

  @P2 @a11y @known-bug @BUG-025
  Scenario: Text on the home page has enough contrast to read
    Given I am a visitor who is not signed in
    When I go to "/"
    Then an accessibility scan should find no colour-contrast problems

  @P2 @a11y @known-bug @BUG-051
  Scenario: The home page has a single main heading
    Given I am a visitor who is not signed in
    When I go to "/"
    Then the page should have exactly one level-1 heading

  @P2 @a11y
  Scenario: A member can sign in using only the keyboard
    Given there is an approved member named "Amina"
    When "Amina" signs in using only the keyboard
    Then I should be on the home page
    And the navigation should offer the "Membership" menu

  @P2 @serial
  Scenario: The elections page says so when there are no elections
    Given there are no current elections
    And I am signed in as an approved member
    When I go to "/elections"
    Then I should see "No active elections at the moment."

  @P2 @serial
  Scenario: The fundraisers page says so when there are no fundraisers
    Given there are no active fundraisers
    And I am signed in as an approved member
    When I go to the fundraisers page
    Then I should see "No fundraisers found."
