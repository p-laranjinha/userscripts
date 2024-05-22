/**
 * Uses a MutationObserver to wait until the element we want exists.
 * This function is required because elements take a while to appear sometimes.
 * https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
 * @param {string} selector A string for document.querySelector describing the elements we want.
 * @returns {Promise<HTMLElement[]>} The list of elements found.
 */
function waitForElements(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelectorAll(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelectorAll(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/**
 * Uses a MutationObserver to wait until the element no longer exists.
 * @param {HTMLElement} element
 * @returns {Promise<null>}
 */
function waitForElementToBeRemovedOrHidden(element) {
  return new Promise((resolve) => {
    if (!document.contains(element) || element.style.display === "none") {
      return resolve();
    }

    const observer = new MutationObserver(() => {
      if (!document.contains(element) || element.style.display === "none") {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributeOldValue: true,
      attributeFilter: ["style"],
    });
  });
}

/**
 * Make a GraphQL mutation to a single entry on AniList
 * @param {number} id The id of the entry to update. Not media_id (use turnMediaIdsIntoIds() to get the actual id). Should be an int.
 * @param {Object} values The values to update
 * @param {("CURRENT"|"PLANNING"|"COMPLETED"|"DROPPED"|"PAUSED"|"REPEATING")} [values.status]
 * @param {number} [values.score]
 * @param {number} [values.scoreRaw] Should be an int.
 * @param {number} [values.progress] Should be an int.
 * @param {number} [values.progressVolumes] Should be an int.
 * @param {number} [values.repeat] Should be an int.
 * @param {number} [values.priority] Should be an int.
 * @param {boolean} [values.private]
 * @param {string} [values.notes]
 * @param {boolean} [values.hiddenFromStatusLists]
 * @param {string[]} [values.customLists]
 * @param {number[]} [values.advancedScores]
 * @param {Object} [values.startedAt]
 * @param {number} values.startedAt.year Should be an int.
 * @param {number} values.startedAt.month Should be an int.
 * @param {number} values.startedAt.day Should be an int.
 * @param {Object} [values.completedAt]
 * @param {number} values.completedAt.year Should be an int.
 * @param {number} values.completedAt.month Should be an int.
 * @param {number} values.completedAt.day Should be an int.
 */
async function singleUpdate(id, values) {
  const query = `
  mutation (
    $id: Int
    $status: MediaListStatus
    $score: Float
    $scoreRaw: Int
    $progress: Int
    $progressVolumes: Int
    $repeat: Int
    $priority: Int
    $private: Boolean
    $notes: String
    $hiddenFromStatusLists: Boolean
    $customLists: [String]
    $advancedScores: [Float]
    $startedAt: FuzzyDateInput
    $completedAt: FuzzyDateInput
  ) {SaveMediaListEntry(
      id: $id
      status: $status
      score: $score
      scoreRaw: $scoreRaw
      progress: $progress
      progressVolumes: $progressVolumes
      repeat: $repeat
      priority: $priority
      private: $private
      notes: $notes
      hiddenFromStatusLists: $hiddenFromStatusLists
      customLists: $customLists
      advancedScores: $advancedScores
      startedAt: $startedAt
      completedAt: $completedAt
    ) {
      id
      updatedAt
    }
  }`;

  const variables = {
    id,
    ...values,
  };

  anilistFetch(
    JSON.stringify({
      query: query,
      variables: variables,
    })
  );
}

/**
 * Make a GraphQL mutation to update multiple entries on AniList
 * @param {number[]} ids The ids of the entries to update. Not media_ids (use turnMediaIdsIntoIds() to get the actual ids). Should be ints.
 * @param {Object} values The values to update
 * @param {("CURRENT"|"PLANNING"|"COMPLETED"|"DROPPED"|"PAUSED"|"REPEATING")} [values.status]
 * @param {number} [values.score]
 * @param {number} [values.scoreRaw] Should be an int.
 * @param {number} [values.progress] Should be an int.
 * @param {number} [values.progressVolumes] Should be an int.
 * @param {number} [values.repeat] Should be an int.
 * @param {number} [values.priority] Should be an int.
 * @param {boolean} [values.private]
 * @param {string} [values.notes]
 * @param {boolean} [values.hiddenFromStatusLists]
 * @param {number[]} [values.advancedScores]
 * @param {Object} [values.startedAt]
 * @param {number} values.startedAt.year Should be an int.
 * @param {number} values.startedAt.month Should be an int.
 * @param {number} values.startedAt.day Should be an int.
 * @param {Object} [values.completedAt]
 * @param {number} values.completedAt.year Should be an int.
 * @param {number} values.completedAt.month Should be an int.
 * @param {number} values.completedAt.day Should be an int.
 */
async function batchUpdate(ids, values) {
  const query = `
  mutation (
    $ids: [Int]
    $status: MediaListStatus
    $score: Float
    $scoreRaw: Int
    $progress: Int
    $progressVolumes: Int
    $repeat: Int
    $priority: Int
    $private: Boolean
    $notes: String
    $hiddenFromStatusLists: Boolean
    $advancedScores: [Float]
    $startedAt: FuzzyDateInput
    $completedAt: FuzzyDateInput
  ) {UpdateMediaListEntries(
      ids: $ids
      status: $status
      score: $score
      scoreRaw: $scoreRaw
      progress: $progress
      progressVolumes: $progressVolumes
      repeat: $repeat
      priority: $priority
      private: $private
      notes: $notes
      hiddenFromStatusLists: $hiddenFromStatusLists
      advancedScores: $advancedScores
      startedAt: $startedAt
      completedAt: $completedAt
    ) {
      id
      updatedAt
    }
  }`;

  const variables = {
    ids,
    ...values,
  };

  anilistFetch(
    JSON.stringify({
      query: query,
      variables: variables,
    })
  );
}

/**
 * Turn media_ids (identifies the manga/anime itself) into ids (identifies a users instance of the manga/anime).
 * @param {int[]} media_ids
 * @returns {Promise<int[]>}
 */
async function turnMediaIdsIntoIds(media_ids) {
  const query = `query ($media_ids: [Int], $page: Int, $per_page: Int) {
    Page(page: $page, perPage: $per_page) {
      mediaList(mediaId_in: $media_ids, userName: "${
        window.location.href.split("/")[4]
      }", compareWithAuthList: true) {
        id
      }
    }
  }`;
  const page_size = 50;

  let ids = [];
  for (let i = 0; i < media_ids.length; i += page_size) {
    const page = media_ids.slice(i, i + page_size);
    const variables = {
      media_ids: page,
      page: 1,
      per_page: page_size,
    };
    const response = await anilistFetch(
      JSON.stringify({
        query: query,
        variables: variables,
      })
    );
    ids.push(
      ...response["data"]["Page"]["mediaList"].map((entry) => entry["id"])
    );
  }

  return ids;
}

/**
 * Requests from the AniList GraphQL API.
 * Uses a url and token specific to the website for simplicity
 * (the user doesn't need to get a token) and for no rate limiting.
 * @param {string} body A GraphQL query string.
 * @returns The response json if the request works.
 */
async function anilistFetch(body) {
  const tokenScript = document
    .evaluate("/html/head/script[contains(., 'window.al_token')]", document)
    .iterateNext();
  const token = tokenScript.innerText.substring(
    tokenScript.innerText.indexOf('"') + 1,
    tokenScript.innerText.lastIndexOf('"')
  );

  let url = "https://anilist.co/graphql";
  let options = {
    method: "POST",
    headers: {
      "X-Csrf-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  };

  function handleResponse(response) {
    return response.json().then(function (json) {
      return response.ok ? json : Promise.reject(json);
    });
  }

  function handleData(data) {
    return data;
  }

  function handleError(error) {
    alert(
      "An error ocurred when requesting from the AniList API. Check the console for more details."
    );
    console.error(error);
  }

  return await fetch(url, options)
    .then(handleResponse)
    .then(handleData)
    .catch(handleError);
}
