(() => {
  const sorterState = globalThis.__rmpSorter ?? {};
  globalThis.__rmpSorter = sorterState;

  if (sorterState.timeoutId !== undefined) {
    clearTimeout(sorterState.timeoutId);
  }

  sorterState.resultsObserver?.disconnect();
  sorterState.timeoutId = undefined;
  sorterState.resultsObserver = null;

  console.log(sorterState.started ? "Sort restarted" : "Sort loaded");
  sorterState.started = true;

  const teacherCardSelector = '[class*="TeacherCard__StyledTeacherCard"]';
  const resultsWrapperSelector =
    '[class*="SearchResultsPage__StyledResultsWrapper"]';
  const ratingSelector = '[class*="CardNumRating__CardNumRatingNumber"]';
  const ratingCountSelector = '[class*="CardNumRating__CardNumRatingCount"]';
  const showMoreText = "Show More";
  const initialDelay = 50;
  const maxDelay = 10000;

  let delay = initialDelay;
  let resultsObserver = null;

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", start, {
      once: true,
    });
  } else {
    start();
  }

  function start() {
    const parent = findResultsWrapper();
    if (parent !== null) {
      startSorting(parent);
      return;
    }

    observeForResultsWrapper();
  }

  function startSorting(parent) {
    sortCurrentCards(parent);
    expandUntilDone(parent);
  }

  function expandUntilDone(parent) {
    if (!parent.isConnected) {
      delay = initialDelay;
      start();
      return;
    }

    if (expand()) {
      delay = initialDelay;
    } else {
      delay = delay * 2;
      if (delay > maxDelay) {
        sortCurrentCards(parent);
        sorterState.timeoutId = undefined;
        return;
      }
    }

    sortCurrentCards(parent);
    sorterState.timeoutId = setTimeout(() => expandUntilDone(parent), delay);
  }

  function expand() {
    const buttons = Array.from(document.getElementsByTagName("button"));
    const showMoreButton = buttons.find(
      (button) =>
        !button.disabled && button.textContent?.trim() === showMoreText,
    );

    if (showMoreButton === undefined) {
      return false;
    }

    showMoreButton.click();
    return true;
  }

  function sortCurrentCards(parent) {
    const cards = parent.querySelectorAll(teacherCardSelector);
    sort(cards, parent);
  }

  function findResultsWrapper() {
    const wrapper = document.querySelector(resultsWrapperSelector);
    if (wrapper !== null) {
      return wrapper;
    }

    return document.querySelector(teacherCardSelector)?.parentElement ?? null;
  }

  function observeForResultsWrapper() {
    if (resultsObserver !== null) {
      return;
    }

    resultsObserver = new MutationObserver(() => {
      const parent = findResultsWrapper();
      if (parent === null) {
        return;
      }

      resultsObserver?.disconnect();
      resultsObserver = null;
      sorterState.resultsObserver = null;
      startSorting(parent);
    });

    sorterState.resultsObserver = resultsObserver;

    resultsObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function sort(cards, parent) {
    const professorCards = Array.from(cards);
    if (professorCards.length === 0) {
      return;
    }

    const cardContainer = getCardContainer(professorCards, parent);
    if (cardContainer === null) {
      console.error("Could not find a shared professor card container");
      return;
    }

    const sortedCards = professorCards
      .map((card, index) => {
        return {
          card,
          index,
          rating: getRating(card),
          ratingCount: getRatingCount(card),
        };
      })
      .sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }

        if (a.ratingCount !== b.ratingCount) {
          return b.ratingCount - a.ratingCount;
        }

        return a.index - b.index;
      })
      .map(({ card }) => card);

    const marker = document.createComment("rmp-sort-marker");
    cardContainer.insertBefore(marker, professorCards[0]);

    for (const card of sortedCards) {
      cardContainer.insertBefore(card, marker);
    }

    marker.remove();
  }

  function getRating(card) {
    const ratingNode = card.querySelector(ratingSelector);
    if (ratingNode === null) {
      console.warn("Could not find rating for professor card", card);
      return Number.NEGATIVE_INFINITY;
    }

    const rating = Number.parseFloat(ratingNode.textContent?.trim() ?? "");
    if (Number.isNaN(rating)) {
      console.warn("Could not parse rating for professor card", card);
      return Number.NEGATIVE_INFINITY;
    }

    return rating;
  }

  function getRatingCount(card) {
    const ratingCountNode = card.querySelector(ratingCountSelector);
    if (ratingCountNode === null) {
      console.warn("Could not find rating count for professor card", card);
      return Number.NEGATIVE_INFINITY;
    }

    const ratingCountText = ratingCountNode.textContent?.trim() ?? "";
    const ratingCountMatch = ratingCountText.match(/[\d,]+/);
    if (ratingCountMatch === null) {
      console.warn("Could not parse rating count for professor card", card);
      return Number.NEGATIVE_INFINITY;
    }

    return Number.parseInt(ratingCountMatch[0].replaceAll(",", ""), 10);
  }

  function getCardContainer(cards, parent) {
    const firstCardParent = cards[0]?.parentElement ?? null;
    if (firstCardParent === null || !parent.contains(firstCardParent)) {
      return null;
    }

    if (!cards.every((card) => card.parentElement === firstCardParent)) {
      return null;
    }

    return firstCardParent;
  }
})();
