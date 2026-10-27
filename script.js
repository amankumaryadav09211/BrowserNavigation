
/*
  Browser Navigation System Using Doubly Linked List

  Features:
  1. Back and Forward navigation
  2. Multiple tabs and closing tabs
  3. Incognito tabs
  4. Global browsing history
  5. Clear Page without deleting navigation history
  6. Preserve Forward history when visiting a new page
  7. URL validation
  8. External websites open in separate browser tabs
*/

const NEW_TAB = "about:newtab";
const HISTORY_PAGE = "about:history";

const SHORTCUTS = [
  ["Google", "https://www.google.com/"],
  ["YouTube", "https://www.youtube.com/"],
  ["Wikipedia", "https://www.wikipedia.org/"],
  ["GitHub", "https://github.com/"]
];

class Node {
  constructor(url) {
    this.url = url;
    this.prev = null;
    this.next = null;
  }
}

let tabs = [];
let activeIndex = 0;
let globalHistory = [];
let statusText = "";

const $ = id => document.getElementById(id);

function tab() {
  return tabs[activeIndex];
}

// ---------- URL validation ----------

function makeFullUrl(value) {
  const input = value.trim();

  if (!input) return null;

  // Allow internal simulator pages.
  if (input === NEW_TAB || input === HISTORY_PAGE) {
    return input;
  }

  // Add HTTPS if no protocol is provided.
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)
    ? input
    : "https://" + input;

  try {
    const url = new URL(candidate);

    // Allow only HTTP and HTTPS websites.
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    // Allow normal domains, localhost, and IPv4 addresses.
    const hostname = url.hostname;
    const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    const isLocalhost = hostname === "localhost";

    if (
      !hostname ||
      (!hostname.includes(".") && !isLocalhost && !isIPv4)
    ) {
      return null;
    }

    // Validate IPv4 octets if an IPv4 address was entered.
    if (
      isIPv4 &&
      hostname.split(".").some(part => Number(part) > 255)
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

// ---------- Tabs ----------

function createTab(incognito = false) {
  const first = new Node(NEW_TAB);

  tabs.push({
    head: first,
    tail: first,
    current: first,
    incognito,
    pageCleared: false
  });

  activeIndex = tabs.length - 1;

  statusText = incognito
    ? "Incognito tab opened. Visits will not be saved to browsing history."
    : "New tab opened.";

  displayHistory();
}

function closeTab(index) {
  if (index < 0 || index >= tabs.length) return;

  tabs.splice(index, 1);

  if (tabs.length === 0) {
    tabs = [];
    activeIndex = 0;
    createTab(false);
    return;
  }

  if (index < activeIndex) {
    activeIndex--;
  } else if (index === activeIndex) {
    activeIndex = Math.min(index, tabs.length - 1);
  }

  statusText = "Tab closed.";
  displayHistory();
}

// ---------- External websites ----------

function openExternalWebsite(url) {
  const opened = window.open(url, "_blank");

  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // Browser security settings may restrict access.
    }

    return true;
  }

  return false;
}

// ---------- Doubly Linked List navigation ----------

function visitWebsite(input, options = {}) {
  const url = makeFullUrl(input);

  if (!url) {
    statusText = "Invalid URL. Enter a valid website address.";
    $("statusMsg").textContent = statusText;
    return;
  }

  const t = tab();

  if (!t) return;

  // If the current page is cleared, visiting the same URL
  // restores its displayed content.
  if (t.current.url === url) {
    if (t.pageCleared) {
      t.pageCleared = false;
      statusText = "Page restored: " + url;
      displayHistory();
    } else {
      statusText = "You are already on this page.";
      displayHistory();
    }

    return;
  }

  // Insert the new node after the current node.
  // Do not delete the existing Forward history.
  const newNode = new Node(url);
  const oldNext = t.current.next;

  newNode.prev = t.current;
  newNode.next = oldNext;

  t.current.next = newNode;

  if (oldNext !== null) {
    oldNext.prev = newNode;
  } else {
    t.tail = newNode;
  }

  t.current = newNode;
  t.pageCleared = false;

  // Save normal website visits, but not internal pages
  // or visits from incognito tabs.
  if (!t.incognito && !url.startsWith("about:")) {
    globalHistory.push({
      url: url,
      time: new Date().toLocaleString()
    });
  }

  if (url.startsWith("about:")) {
    statusText = "Opened browser page: " + url;
  } else if (options.openExternal !== false) {
    const opened = openExternalWebsite(url);

    statusText = opened
      ? "Opened " + url + " in a new browser tab."
      : "Popup blocked. Use the Open Website link below.";
  } else {
    statusText = "Visited " + url;
  }

  displayHistory();
}

function goBack() {
  const t = tab();

  if (!t) return;

  if (t.current.prev) {
    t.current = t.current.prev;
    t.pageCleared = false;
    statusText = "Went back to " + t.current.url;
  } else {
    statusText = "No previous page.";
  }

  displayHistory();
}

function goForward() {
  const t = tab();

  if (!t) return;

  if (t.current.next) {
    t.current = t.current.next;
    t.pageCleared = false;
    statusText = "Went forward to " + t.current.url;
  } else {
    statusText = "No next page.";
  }

  displayHistory();
}

function goHome() {
  const t = tab();

  if (!t) return;

  t.current = t.head;
  t.pageCleared = false;

  statusText = "Returned to the New Tab page.";

  displayHistory();
}

function refreshPage() {
  const t = tab();

  if (!t) return;

  const url = t.current.url;

  // Restore the current simulator page if it was cleared.
  t.pageCleared = false;

  if (url.startsWith("about:")) {
    statusText = "Browser page refreshed.";
    displayHistory();
    return;
  }

  const opened = openExternalWebsite(url);

  statusText = opened
    ? "Reopened " + url + " in a new browser tab."
    : "Popup blocked. Use the Open Website link below.";

  displayHistory();
}

// ---------- Clear Page ----------


function clearPage() {
    const t = tab();

    if (!t) return;

    const current = t.current;

    // If this is the only node, keep one empty New Tab node.
    if (current === t.head && current === t.tail) {
        current.url = NEW_TAB;
        current.prev = null;
        current.next = null;
        t.head = current;
        t.tail = current;
        t.current = current;
    } else {
        const previous = current.prev;
        const next = current.next;

        // Connect the previous node to the next node.
        if (previous) {
            previous.next = next;
        } else {
            t.head = next;
            next.prev = null;
        }

        if (next) {
            next.prev = previous;
        } else {
            t.tail = previous;
            previous.next = null;
        }

        // Move current to the next available node,
        // or the previous node if there is no next node.
        t.current = next || previous;
    }

    // Clear the blank-state flag and update the display.
    t.pageCleared = false;
    statusText = "Page cleared and current node deleted.";

    displayHistory();
}


// ---------- Page rendering ----------

function shortName(value) {
  if (value === NEW_TAB) return "New Tab";
  if (value === HISTORY_PAGE) return "History";

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function addText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) {
    element.className = className;
  }

  parent.appendChild(element);
  return element;
}

function showPage() {
  const t = tab();
  const page = $("page");

  page.replaceChildren();

  // If cleared, leave the viewport blank.
  if (t.pageCleared) {
    return;
  }

  const url = t.current.url;

  const inner = document.createElement("div");
  inner.className = "page-inner";
  page.appendChild(inner);

  // New Tab page.
  if (url === NEW_TAB) {
    addText(
      inner,
      "h2",
      t.incognito ? "Incognito mode" : "New Tab"
    );

    addText(
      inner,
      "p",
      t.incognito
        ? "This tab's visits are not added to this project's browsing history. This simulator does not control your real browser's privacy records."
        : "Enter a website address above or select a shortcut."
    );

    const shortcuts = document.createElement("div");
    shortcuts.className = "shortcuts";
    inner.appendChild(shortcuts);

    SHORTCUTS.forEach(([name, address]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      button.dataset.url = address;
      shortcuts.appendChild(button);
    });

    return;
  }

  // Internal History page.
  if (url === HISTORY_PAGE) {
    addText(inner, "h2", "Browsing History");

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "clear-btn";
    clear.textContent = "Clear history";
    clear.id = "clearHistoryBtn";
    inner.appendChild(clear);

    if (globalHistory.length === 0) {
      addText(inner, "p", "No saved browsing history.");
      return;
    }

    [...globalHistory].reverse().forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hist-row";
      button.dataset.url = item.url;

      addText(button, "span", item.time);
      addText(button, "span", item.url);

      inner.appendChild(button);
    });

    return;
  }

  // Website information page.
  addText(inner, "h2", shortName(url));
  addText(inner, "p", url);

  addText(
    inner,
    "p",
    "This website opens separately because many websites do not allow embedding inside another page."
  );

  const link = document.createElement("a");
  link.className = "open-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open " + shortName(url);

  inner.appendChild(link);
}

// ---------- Tab bar rendering ----------

function drawTabs() {
  const bar = $("tabBar");
  bar.replaceChildren();

  tabs.forEach((t, index) => {
    const tabElement = document.createElement("div");

    tabElement.className =
      "tab" +
      (index === activeIndex ? " active" : "") +
      (t.incognito ? " incognito" : "");

    tabElement.dataset.tab = index;

    const label = document.createElement("span");
    label.textContent =
      (t.incognito ? "🕶 " : "") + shortName(t.current.url);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.dataset.close = index;
    close.textContent = "×";
    close.title = "Close tab";
    close.setAttribute("aria-label", "Close tab");

    tabElement.append(label, close);
    bar.appendChild(tabElement);
  });

  const newTabButton = document.createElement("button");
  newTabButton.type = "button";
  newTabButton.id = "newTabBtn";
  newTabButton.textContent = "+";
  newTabButton.title = "New tab";
  bar.appendChild(newTabButton);

  const incognitoButton = document.createElement("button");
  incognitoButton.type = "button";
  incognitoButton.id = "incognitoBtn";
  incognitoButton.textContent = "🕶 Incognito";
  incognitoButton.title = "Open an incognito simulator tab";
  bar.appendChild(incognitoButton);
}

// ---------- Linked list visualization ----------

function drawList() {
  const t = tab();
  const view = $("listView");

  view.replaceChildren();

  function addBox(text, className) {
    addText(view, "span", text, className);
  }

  addBox("NULL", "null-box");

  let node = t.head;

  while (node !== null) {
    addBox("⇄", "arrow");

    const box = document.createElement("div");
    box.className =
      "node" + (node === t.current ? " current" : "");

    addText(box, "div", shortName(node.url), "name");

    const pointers = document.createElement("div");
    pointers.className = "ptrs";

    addText(
      pointers,
      "span",
      "prev: " + (node.prev ? shortName(node.prev.url) : "NULL")
    );

    addText(
      pointers,
      "span",
      "next: " + (node.next ? shortName(node.next.url) : "NULL")
    );

    box.appendChild(pointers);
    view.appendChild(box);

    node = node.next;
  }

  addBox("⇄", "arrow");
  addBox("NULL", "null-box");

  const pointerInfo = $("pointerInfo");
  pointerInfo.replaceChildren();

  addText(pointerInfo, "span", "head → " + shortName(t.head.url));
  addText(pointerInfo, "span", "tail → " + shortName(t.tail.url));
  addText(pointerInfo, "span", "current → " + shortName(t.current.url));
}

// ---------- History and screen updates ----------

function displayHistory() {
  const t = tab();

  if (!t) return;

  $("browser").classList.toggle("incognito", t.incognito);
  $("statusMsg").textContent = statusText;

  $("urlInput").value = t.current.url.startsWith("about:")
    ? ""
    : t.current.url;

  $("backBtn").disabled = !t.current.prev;
  $("forwardBtn").disabled = !t.current.next;

  drawTabs();
  showPage();
  drawList();

  const historyList = $("historyList");
  historyList.replaceChildren();

  if (globalHistory.length === 0) {
    addText(historyList, "li", "No saved visits yet.", "empty");
  } else {
    [...globalHistory].reverse().forEach((item, index) => {
      const li = document.createElement("li");

      addText(li, "span", (index + 1) + ".", "pos");
      addText(li, "span", item.time + " — " + item.url);

      historyList.appendChild(li);
    });
  }
}

// ---------- Event listeners ----------

function onVisitClick() {
  const input = $("urlInput").value;

  if (!input.trim()) {
    statusText = "Please enter a website address.";
    $("statusMsg").textContent = statusText;
    return;
  }

  visitWebsite(input);
}

$("visitBtn").addEventListener("click", onVisitClick);

$("urlInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    onVisitClick();
  }
});

$("backBtn").addEventListener("click", goBack);
$("forwardBtn").addEventListener("click", goForward);
$("homeBtn").addEventListener("click", goHome);
$("refreshBtn").addEventListener("click", refreshPage);

// Clear Page button: index.html must use id="clearPageBtn".
$("clearPageBtn").addEventListener("click", clearPage);

$("historyBtn").addEventListener("click", () => {
  visitWebsite(HISTORY_PAGE, { openExternal: false });
});

// Tab bar controls.
$("tabBar").addEventListener("click", event => {
  const closeButton = event.target.closest("[data-close]");

  if (closeButton) {
    closeTab(Number(closeButton.dataset.close));
    return;
  }

  const tabButton = event.target.closest("[data-tab]");

  if (tabButton) {
    activeIndex = Number(tabButton.dataset.tab);
    statusText = "Switched tab.";
    displayHistory();
    return;
  }

  if (event.target.closest("#newTabBtn")) {
    createTab(false);
  } else if (event.target.closest("#incognitoBtn")) {
    createTab(true);
  }
});

// Click shortcuts, history entries, and Clear History.
$("page").addEventListener("click", event => {
  const clearButton = event.target.closest("#clearHistoryBtn");

  if (clearButton) {
    globalHistory = [];
    statusText = "Browsing history cleared.";
    displayHistory();
    return;
  }

  const link = event.target.closest("[data-url]");

  if (link) {
    visitWebsite(link.dataset.url);
  }
});

// ---------- Start the simulator ----------

createTab(false);
