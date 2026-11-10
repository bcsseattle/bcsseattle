@quality
Feature: The site works on phones and with assistive technology
  As a visitor on a phone, using a keyboard or a screen reader
  I want every page to be usable
  So that nobody in the community is shut out

  @P2 @mobile @BUG-050
  Scenario Outline: <path> fits a phone screen without sideways scrolling
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then the page should fit the screen width

    Examples:
      | path         |
      | /            |
      | /donate      |
      | /about-us    |
      | /fundraisers |
      | /contact-us  |
      | /about-us/bylaws        |
      | /about-us/mission       |
      | /about-us/vision        |
      | /resources              |
      | /resources/immigration  |
      | /funeral-burials        |
      | /youth-programs         |
      | /privacy                |
      | /terms                  |
      | /signin/password_signin |
      | /register               |

  @P2 @mobile
  Scenario Outline: The portal page <path> fits a phone screen without sideways scrolling
    Given I am signed in as an admin
    When I go to "<path>"
    Then the page should fit the screen width

    Examples:
      | path                    |
      | /elections              |
      | /community-funds        |
      | /account                |
      | /members                |
      | /contribute             |
      | /admin/members          |
      | /admin/expenses         |
      | /admin/elections        |
      | /admin/voting-config    |
      | /admin/election-types   |
      | /fundraisers/admin/new  |

  @P2 @mobile
  Scenario: An election, its candidates and its results fit a phone screen
    Given there is an open election with candidates "Hani" and "Nazir" for "President"
    And I am signed in as an admin
    When I open the election
    Then the page should fit the screen width
    When I open the nomination page
    Then the page should fit the screen width
    When I open the election results
    Then the page should fit the screen width

  @P2 @mobile
  Scenario: A fundraiser and its donation page fit a phone screen
    Given there is an active fundraiser "Roof repair" with a goal of $2,000
    And I am a visitor who is not signed in
    When I open the fundraiser
    Then the page should fit the screen width
    When I open the donation page of "Roof repair"
    Then the page should fit the screen width

  @P2 @mobile @BUG-050
  Scenario: The site can be navigated on a phone
    Given I am a visitor who is not signed in
    When I go to "/"
    And I open the phone menu and choose "Fundraisers"
    Then I should be on the fundraisers page

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

  @P2 @a11y @BUG-025
  Scenario: Text on the home page has enough contrast to read
    Given I am a visitor who is not signed in
    When I go to "/"
    Then an accessibility scan should find no colour-contrast problems

  @P2 @a11y @BUG-051
  Scenario Outline: <path> has a single main heading
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then the page should have exactly one level-1 heading

    Examples:
      | path                    |
      | /                       |
      | /about-us               |
      | /about-us/mission       |
      | /what-we-do             |
      | /donate                 |
      | /fundraisers            |
      | /contact-us             |
      | /signin/password_signin |

  @P2 @a11y
  Scenario: A member can sign in using only the keyboard
    Given there is an approved member named "Amina"
    When "Amina" signs in using only the keyboard
    Then I should be on the home page
    And the navigation should offer the "My account" link

  @P2 @serial
  Scenario: The elections page says so when there are no elections
    Given there are no current elections
    And I am signed in as an approved member
    When I go to "/elections"
    Then I should see "No active elections at the moment"

  @P2 @serial
  Scenario: The fundraisers page says so when there are no fundraisers
    Given there are no active fundraisers
    And I am signed in as an approved member
    When I go to the fundraisers page
    Then I should see "No active fundraisers right now"

  @P2 @a11y @BUG-066
  Scenario Outline: <path> has no controls nested in each other and no broken lists
    Given I am signed in as an admin
    And there is an open election with candidates "Hani" and "Nazir" for "President"
    When I go to "<path>"
    Then an accessibility scan should find no nested controls or broken lists

    Examples:
      | path             |
      | /                |
      | /terms           |
      | /contact-us      |
      | /elections       |
      | /admin/members   |
