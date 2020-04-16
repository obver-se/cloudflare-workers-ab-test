addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/** The url to pull other urls from */
const URLS_SOURCE = "https://cfw-takehome.developers.workers.dev/api/variants"

/** The name of the cookie that provides which url the user has already seen */
const COOKIE_NAME = "variant"

/** 
 * The time in seconds that the cookie should be retained for
 * 60 seconds in a minute, 60 minutes in an hour, 24 hours in a day, 14 days total
 * Retains the cookie for 14 days
 */
const COOKIE_EXPR = 60 * 60 * 24 * 14

/** the HTMLRewriter that customizes the page to this specific project */
const rewriter = 
  new HTMLRewriter()
    .on("title", 
      {element: (element) => {element.setInnerContent("Welcome to my submission")}})
    .on("a#href", 
      {element: (element) => {element.setAttribute("href", "example.com")}})
    .on("h1#title", 
      {element: (element) => {element.setInnerContent("uniquedoma.in is a site I made.")}})
    .on("p#description", 
      {element: (element) => {element.setInnerContent("It allows users to generate domain names.")}})
    .on("a#url", 
      {element: (element) => {element.setInnerContent("Click here to check it out!")
                              element.setAttribute("href", "https://uniquedoma.in")}})

/**
 * Returns all the given cookies in a request
 *
 * @param {Request} request
 * @returns {Map} A map of all the cookies and their values as strings
 */
function getCookies(request) {
  const keyValues = new Map()

  if (request.headers.has("cookie")) {
    // Individual cookies are seperated by "; "
    for (const pair of request.headers.get("cookie").split("; ")) {
      // Each cookie is in the form "<key>=<value>"
      if (pair.includes('=')) {
        var splitPair = pair.split('=')
        keyValues.set(splitPair[0], splitPair[1])
      }
    }
  }

  return keyValues
}

/** The array of urls to pick from */
var urls

/**
 * Respond with with one of two urls provided from:
 * https://cfw-takehome.developers.workers.dev/api/variants 
 *
 * @param {Request} request
 */
async function handleRequest(request) {
  // Get the potential urls if they haven't already been gotten
  if (urls === undefined) {
    const urls_response = await fetch(URLS_SOURCE)
    const data = await urls_response.json()
    urls = data["variants"]
  }

  // Get the cookies from the requester
  const cookies = getCookies(request)

  var response
  // If the cookie is already set and is valid then get the page variant they got last time
  if (cookies.has(COOKIE_NAME) && parseInt(cookies.get(COOKIE_NAME)) >= 0 &&
                                  parseInt(cookies.get(COOKIE_NAME)) <= (urls.length - 1)) {
    // get the correct page url from the cookies
    var choiceIndex = parseInt(cookies.get(COOKIE_NAME))
    var url = urls[choiceIndex]

    // Fetch the chosen url
    response = await fetch(url)
  } else {
    // Pick a random page url
    var choiceIndex = Math.floor(Math.random() * urls.length)
    var url = urls[choiceIndex]

    // Fetch the chosen url
    response = await fetch(url)

    // Copy the response to make the headers editable
    response = new Response(response.body, response)
    // Add the cookie setter to the headers
    response.headers.append("set-cookie", COOKIE_NAME + "=" + choiceIndex + "; max-age=" + COOKIE_EXPR )
  }

  // Modify response content
  return rewriter.transform(response)
}
