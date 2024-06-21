// Paths
const allStoragePath = "/api/all-storage";
const getStoragePath = "/api/storage";
const createStoragePath = "/api/storage/create";
const editStoragePath = "/api/storage/edit";
const getItemPath = "/api/item";
const createItemPath = "/api/item/create";
const editItemPath = "/api/item/edit";
const addTagImgPath = "/plus-square.svg";
const trashImgPath = "/trash-icon.svg";


const errorOnFetch = "An error has occured upon retrieving the data. Please refresh the page and try again.";
const errorOnPost = "An error has occured upon making the request. Please refresh the page and try again."

/**
 * @param {string} baseUrl
 * @param {string} ownerId
 * @param {string} id
 * @returns {string}
 */
function getPath(baseUrl, ownerId, id) {
  if (!baseUrl || !ownerId || !id) throw "Not a string";

  let url =
    baseUrl +
    "?" +
    new URLSearchParams({
      owner: ownerId.toString(),
      id: id.toString(),
    });
  console.log(url);
  return url;
}

/**
 *
 * @param {string} title
 * @param {string} description
 * @returns {HTMLDivElement}
 */
function createWarningWindow(titleText, warningText = "") {
  let backgroundCancel = document.createElement("div");
  backgroundCancel.classList.add("background-cancel");
  backgroundCancel.addEventListener("click", () => {
    backgroundCancel.remove();
  });
  document.body.appendChild(backgroundCancel);

  let warningWindow = document.createElement("div");
  warningWindow.classList.add("warning-window");
  warningWindow.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  backgroundCancel.appendChild(warningWindow);

  let title = document.createElement("p");
  title.classList.add("warning-title");
  title.innerText = titleText;
  warningWindow.appendChild(title);

  let description = document.createElement("p");
  description.classList.add("warning-text");
  description.innerText = warningText;
  warningWindow.appendChild(description);

  return warningWindow;
}

/**
 *
 * @param {string} message
 */
function errorMessage(message) {
  let warningWindow = createWarningWindow("Error", message);
  let closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.id = "cancel-button";
  closeButton.innerText = "Close";
  closeButton.addEventListener("click", () => {
    warningWindow.parentElement.remove();
  });
  warningWindow.appendChild(closeButton);
}

/**
 * @param {HTMLElement} form
 * @param {string} sectionName
 * @returns {HTMLElement}
 */
function createSection(form, sectionName) {
  let section = document.createElement("section");
  section.classList.add("pop-up-section");
  form.appendChild(section);

  let p = document.createElement("p");
  p.innerText = sectionName;
  section.appendChild(p);
  return section;
}

function cancelFormButton() {
  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", () => popUp.toggleAttribute("open", false));
  return cancelButton;
}

/**
 * 
 * @param {HTMLFormElement} form 
 * @param {string} submitText 
 */
function formControlSection(form, submitText) {
  // Form Control Section
  const section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  const doneButton = document.createElement("button");
  doneButton.id = "done-button";
  doneButton.innerText = submitText;
  section.appendChild(doneButton);
  form.addEventListener("submit", () => {
    doneButton.disabled = true;
    setTimeout(() => {
      doneButton.disabled = false;
    }, 1000);
  });

  section.appendChild(cancelFormButton());
}
  
