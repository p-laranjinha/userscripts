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
 * Make a GraphQL mutation to update multiple entries on AniList
 * @param {number[]} ids The ids of the entries to update. Should be ints.
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

  console.log(await turnMediaIdsIntoIds(ids, 1, 50));

  return;

  anilistFetch(
    JSON.stringify({
      query: query,
      variables: variables,
    })
  );
}

async function turnMediaIdsIntoIds(media_ids, page, per_page) {
  const query = `query ($media_ids: [Int], $page: Int, $per_page: Int) {
    Page(page: $page, perPage: $per_page) {
      pageInfo {
        hasNextPage
      }
      mediaList(mediaId_in: $media_ids, userName: "${
        window.location.href.split("/")[4]
      }", compareWithAuthList: true) {
        id
      }
    }
  }`;

  const variables = {
    media_ids,
    page,
    per_page,
  };

  const response = await anilistFetch(
    JSON.stringify({
      query: query,
      variables: variables,
    })
  );

  if (response) {
    return {
      has_next_page: response["data"]["Page"]["pageInfo"]["hasNextPage"],
      ids: response["data"]["Page"]["mediaList"].map((entry) => entry["id"]),
    };
  }
  return {
    has_next_page: false,
    ids: [],
  };
}

async function anilistFetch(body) {
  let url = "https://graphql.anilist.co";
  let options = {
    method: "POST",
    headers: {
      Authorization:
        "Bearer " +
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjU2NDY4ZDQzNDcxYjhiZTAzMzAwOGMwNDhmMDgyZjZlYmU5NTZjZTU4NmYxNTg0NjdjNDljYTY5NWE4OGY1NTA1MzA3YWM2NDBmZGJhMzA2In0.eyJhdWQiOiIxODc0NCIsImp0aSI6IjU2NDY4ZDQzNDcxYjhiZTAzMzAwOGMwNDhmMDgyZjZlYmU5NTZjZTU4NmYxNTg0NjdjNDljYTY5NWE4OGY1NTA1MzA3YWM2NDBmZGJhMzA2IiwiaWF0IjoxNzE1ODk4MTY3LCJuYmYiOjE3MTU4OTgxNjcsImV4cCI6MTc0NzQzNDE2Nywic3ViIjoiMzU0MjU5Iiwic2NvcGVzIjpbXX0.gYqKAN0u61BHJNWE58xj7iek0V-CxJantH8_w1esW5ZZkCXOhEuFvU4JN5wbXqBduQK733twXHOrA3pcM_S5t1XxvArhXBtPJwStebx82qRuNloRaAHoKRZZLpotsafrBEBUctjpaLYutXQ_--Dh3iK-4HZHQGuawoE0C1v8aHZdsaPNvn-2wlcSBRpHRUJ0DwtoBHiJmUR8RSMWR1p3KnVbtLn1u2qEg5ct6amTZJA7IHLla5IBPcdt697eXNhEsn16Z68ILH_iky1ajaYjOo45JHIavc1l1LgdV8CpIf1_SLfgtIH6FYgiLeux_HFoZd860hbEVOfbcHx-TodNmEuq7AoQXDVsbcZLkNBUbwgtcseC8M7uePYvn081HgiLvJoEW4Z0QX_Bp7DGqfoOpNPuNRCCDubYdb5OjUoC5s6wSwD4vdlAINJOiKABu_FPcBYSY5ELjB94Z2-v5dPxD2ht4hHmrLT8MIcgipz7AaCGD_3kascYCbFSnJVZbvVh39HElqSp35ijN6NpJqg7l7wBPn1nkz9cCQT3_Qenh9zksSFKfZSe8PUT_SWGdL8YelPe9A0fLcz-n0-qOKYYlhW9qIc5lYQ-OqH0AAfpiRQvbuDYYDpQit8H4gcEIi0jaR93DeAK3LhsT34c-_l65e6qGhL5-Kr4T2EALvahKeE",
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
    alert("Error, check console");
    console.error(error);
  }

  return await fetch(url, options)
    .then(handleResponse)
    .then(handleData)
    .catch(handleError);
}
