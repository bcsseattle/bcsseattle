@public
Feature: The public website
  As a Baloch family in Washington, or anyone curious about BCS Seattle
  I want to read about the organisation and get in touch
  So that I know what BCS Seattle does and how it can help

  @P1 @smoke
  Scenario Outline: The <page> page opens for anyone
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then I should see the heading "<heading>"

    Examples:
      | page     | path              | heading                                            |
      | home     | /                 | How we support the community                       |
      | about    | /about-us         | About Baloch Community Services of Seattle         |
      | mission  | /about-us/mission | Our Mission                                        |
      | vision   | /about-us/vision  | Our Vision                                         |
      | bylaws   | /about-us/bylaws  | Bylaws of the Baloch Community Services of Seattle |
      | terms    | /terms            | Terms of Service                                   |
      | funeral  | /funeral-burials  | Funeral & Burial                                   |
      | donate   | /donate           | Support BCS Seattle                                |

  @P1
  Scenario: The footer leads to the mission page
    Given I am a visitor who is not signed in
    When I go to "/"
    And I follow the "Mission & vision" link
    Then I should be on the "/about-us/mission" page

  @P1 @BUG-031
  Scenario: A visitor sends a message through the contact form
    Given I am a visitor who is not signed in
    When I send the contact form as "Rahim" from "rahim@example.test" saying "Do you help with citizenship interviews?"
    Then I should be on the home page
    And I should see "Your message has been sent."
    And BCS Seattle should receive a message from "rahim@example.test"

  @P1
  Scenario: The contact form rejects an invalid email address
    Given I am a visitor who is not signed in
    When I send the contact form as "Rahim" from "not-an-email" saying "Hello"
    Then I should see "Invalid email address"
    And I should be on the "/contact-us" page

  # The form blocks the send, but shows a generic "Required" instead of these
  # messages: it has no defaultValues, so an untouched field is undefined.
  @P2 @BUG-075
  Scenario Outline: The contact form says which field is missing
    Given I am a visitor who is not signed in
    When I send the contact form as "<name>" from "rahim@example.test" saying "<message>"
    Then I should see "<error>"

    Examples:
      | name  | message | error               |
      |       | Hello   | Name is required    |
      | Rahim |         | Message is required |

  @P1
  Scenario: A visitor registers interest in the funeral and burial fund
    Given I am a visitor who is not signed in
    When I sign up for the funeral and burial fund as "Rahim Baloch"
    Then I should see "Your response has been recorded."
    And my interest in the funeral and burial fund should be recorded

  @P2 @BUG-047
  Scenario: Every program card on the home page leads to a real page
    Given I am a visitor who is not signed in
    When I go to "/"
    Then every link in the programs section should open a page that exists

  @P2 @BUG-047
  Scenario Outline: No link on a public page leads to a missing page
    Given I am a visitor who is not signed in
    When I go to "<path>"
    Then every link on the page should open a page that exists

    Examples:
      | path             |
      | /                |
      | /about-us        |
      | /what-we-do      |
      | /resources       |
      | /donate          |
      | /fundraisers     |
      | /get-involved    |
      | /signin/password_signin |

  @P2 @BUG-063
  Scenario: Google Analytics isn't loaded when no measurement id is configured
    Given I am a visitor who is not signed in
    When I go to "/"
    Then the page should not load Google Analytics without a measurement id

  @P2 @BUG-049
  Scenario: An unknown address shows the site's own "page not found" page
    Given I am a visitor who is not signed in
    When I go to "/no-such-page"
    Then I should see the heading "Page not found"
    And I should see a "Go to the home page" button

  @P2 @BUG-054
  Scenario: Search engines get a robots.txt and a sitemap of public pages
    Given I am a visitor who is not signed in
    Then robots.txt should keep crawlers out of sign-in and point to the sitemap
    And every page in the sitemap should open

  @P2 @BUG-048
  Scenario: Breadcrumbs name pages instead of showing raw IDs
    Given there is an active fundraiser "Roof repair" with a goal of $2,000
    And I am a visitor who is not signed in
    When I open the fundraiser
    Then the breadcrumbs should not show any raw IDs
