const popUp = document.getElementById("pop-up");
const closePopButton = document.getElementById("pop-up-close");

let id, ownerId;
try {
  id = document.head.querySelector('meta[name="id"]').content;
  ownerId = document.head.querySelector('meta[name="owner-id"]').content;
} catch {}

closePopButton.addEventListener("click", cancelForm);

async function createStorage() {
  // Get Parent Storage option before any operation
  /**@type {JSON} */
  let json;
  try {
    const response = await fetch(allStoragePath);
    json = await response.json();
    console.log(json);
  } catch (e) {
    console.error(e);
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Create Storage";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitStorage(e, createStoragePath));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Parent Storage Section
  let section = createSection(form, "Parent Storage");
  let select = document.createElement("select");
  select.id = "parent-storage";
  select.name = "parent-storage";
  select.autocomplete = "off";
  section.appendChild(select);

  let option = document.createElement("option");
  option.value = "";
  option.text = "Root";
  select.appendChild(option);

  for (let i = 0; i < json.length; i++) {
    let obj = json[i];
    option = document.createElement("option");
    option.text = obj.name;
    option.value = JSON.stringify({
      id: obj.id,
      owner_id: obj.owner_id,
    });
    if (id && obj.id == id) {
      option.selected = true;
      select.disabled = true;
    }

    select.appendChild(option);
  }

  // Storage Name Section
  section = createSection(form, "Storage Name");
  let input = document.createElement("input");
  input.name = "storage-name";
  input.type = "text";
  input.id = "storage-name";
  input.autocomplete = "off";
  input.required = true;
  section.appendChild(input);

  // Description Section
  section = createSection(form, "Description");
  let textarea = document.createElement("textarea");
  textarea.name = "description";
  textarea.id = "description";
  textarea.autocomplete = "off";
  textarea.spellcheck = true;
  section.appendChild(textarea);

  // Tag Section
  section = createSection(form, "Tag");
  input = document.createElement("input");
  input.classList.add("tag-input");
  input.name = "tag";
  input.type = "text";
  input.autocomplete = "off";
  section.appendChild(input);

  let addTagButton = document.createElement("button");
  addTagButton.type = "button";
  addTagButton.id = "add-content";
  addTagButton.addEventListener("click", () =>
    addTagInput(addTagButton.parentElement)
  );
  section.appendChild(addTagButton);

  let img = document.createElement("img");
  img.src = addTagImgPath;
  addTagButton.appendChild(img);

  let p = document.createElement("p");
  p.innerText = "Add Tag";
  addTagButton.appendChild(p);

  // Form Control Section
  section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Create";
  section.appendChild(button);
  form.addEventListener("submit", () => {
    /**@type {HTMLButtonElement} */
    let doneButton = document.getElementById("done-button");
    doneButton.disabled = true;
    setTimeout(() => {
      doneButton.disabled = false;
    }, 1000);
  });

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

async function editStorage() {
  let storageData, name, description, tags;
  try {
    const response = await fetch(getPath(getStoragePath, ownerId, id));

    console.log(response.status);
    storageData = await response.json();
    name = storageData.name;
    description = storageData.description;
    tags = storageData.tags;
  } catch (e) {
    console.log("Error");
    console.log(e);
    errorMessage("An error has occured when fetching data of the storage. Please refresh the page and try again.");
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Edit Storage";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitStorage(e, editStoragePath));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Storage Name Section
  let section = createSection(form, "Storage Name");
  let input = document.createElement("input");
  input.name = "storage-name";
  input.type = "text";
  input.id = "storage-name";
  input.autocomplete = "off";
  input.value = name;
  input.required = true;
  section.appendChild(input);

  // Description Section
  section = createSection(form, "Description");
  let textarea = document.createElement("textarea");
  textarea.name = "description";
  textarea.id = "description";
  textarea.autocomplete = "off";
  textarea.value = description;
  textarea.spellcheck = true;
  section.appendChild(textarea);

  // Tag Section
  section = createSection(form, "Tag");

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    input = document.createElement("input");
    input.classList.add("tag-input");
    input.name = "tag";
    input.type = "text";
    input.value = tag;
    input.autocomplete = "off";
    section.appendChild(input);
  }

  let addTagButton = document.createElement("button");
  addTagButton.type = "button";
  addTagButton.id = "add-content";
  addTagButton.addEventListener("click", () =>
    addTagInput(addTagButton.parentElement)
  );
  section.appendChild(addTagButton);

  let img = document.createElement("img");
  img.src = addTagImgPath;
  addTagButton.appendChild(img);

  let p = document.createElement("p");
  p.innerText = "Add Tag";
  addTagButton.appendChild(p);

  // Form Control Section
  section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Update";
  section.appendChild(button);

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

/**
 * @param {Event} e
 * @param {String} apiPath
 */
async function submitStorage(e, apiPath) {
  e.preventDefault();
  console.log("Checking Form Data");
  // Some Extra Checking

  const formData = new FormData();
  /**@type {HTMLSelectElement} */
  let parentStorage = document.getElementById("parent-storage");
  /**@type {HTMLInputElement} */
  let storageName = document.getElementById("storage-name");
  /**@type {HTMLTextAreaElement} */
  let description = document.getElementById("description");
  /**@type {HTMLCollectionOf<HTMLInputElement>} */
  let tags = document.getElementsByClassName("tag-input");

  try {
    // Required fields (cannot be empty)
    formData.append("storage-name", storageName.value);

    if (id) formData.append("id", id);
    if (ownerId) formData.append("owner-id", ownerId);

    // Optional fields
    formData.append("description", description.value);

    if (parentStorage && parentStorage.value.length > 0) {
      let parentJson = JSON.parse(parentStorage.value);
      formData.append("parent-storage", parentJson.id);
      formData.append("parent-owner", parentJson.owner_id);
    }

    for (let i = 0; i < tags.length; i++) {
      /**@type {HTMLInputElement} */
      let tag = tags[i];
      if (tag.value.length > 0) formData.append("tag", tag.value);
    }
  } catch (error) {
    errorMessage("An error has occured when parsing the form. Please check if every input is vallid.");
    return;
  }

  for (var pair of formData.entries()) {
    console.log(pair[0] + ", " + pair[1]);
  }

  try {
    const response = await fetch(apiPath, {
      method: "POST",
      body: formData,
    });
    console.log(await response.text());

    if (response.status == 200) {
      togglePopUp(false);
      window.location.reload();
    } else {
      errorMessage("An error occured when submitting the form. Please refresh if the error occured again.");
    }
  } catch (e) {
    console.error(e);
  }
}

async function createItem() {
  // Get Parent Storage option before any operation
  /**@type {JSON} */
  let json;
  try {
    const response = await fetch(allStoragePath);
    json = await response.json();
    console.log(json);
  } catch (e) {
    console.error(e);
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Create Item";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitItem(e, createItemPath));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Parent Storage Section
  let section = createSection(form, "Parent Storage");
  let select = document.createElement("select");
  select.id = "parent-storage";
  select.name = "parent-storage";
  select.autocomplete = "off";
  section.appendChild(select);
  
  for (let i = 0; i < json.length; i++) {
    let obj = json[i];
    option = document.createElement("option");
    option.text = obj.name;
    option.value = JSON.stringify({
      id: obj.id,
      owner_id: obj.owner_id,
    });
    if (id && obj.id == id) {
      option.selected = true;
      select.disabled = true;
    }

    select.appendChild(option);
  }

  // Item Name Section
  section = createSection(form, "Item Name");
  let input = document.createElement("input");
  input.name = "item-name";
  input.type = "text";
  input.id = "item-name";
  input.autocomplete = "off";
  input.required = true;
  section.appendChild(input);

  // Description Section
  section = createSection(form, "Description");
  let textarea = document.createElement("textarea");
  textarea.name = "description";
  textarea.id = "description";
  textarea.autocomplete = "off";
  textarea.spellcheck = true;
  section.appendChild(textarea);

  // Tag Section
  section = createSection(form, "Tag");
  input = document.createElement("input");
  input.classList.add("tag-input");
  input.name = "tag";
  input.type = "text";
  input.autocomplete = "off";
  section.appendChild(input);

  let addTagButton = document.createElement("button");
  addTagButton.type = "button";
  addTagButton.id = "add-content";
  addTagButton.addEventListener("click", () =>
    addTagInput(addTagButton.parentElement)
  );
  section.appendChild(addTagButton);

  let img = document.createElement("img");
  img.src = addTagImgPath;
  addTagButton.appendChild(img);

  let p = document.createElement("p");
  p.innerText = "Add Tag";
  addTagButton.appendChild(p);

  // Form Control Section
  section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Create";
  section.appendChild(button);
  form.addEventListener("submit", () => {
    /**@type {HTMLButtonElement} */
    let doneButton = document.getElementById("done-button");
    doneButton.disabled = true;
    setTimeout(() => {
      doneButton.disabled = false;
    }, 1000);
  });

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

async function editItem() {
  let itemData, name, description, tags;
  try {
    const response = await fetch(getPath(getItemPath, ownerId, id));

    itemData = await response.json();
    name = itemData.name;
    description = itemData.description;
    tags = itemData.tags;
  } catch (e) {
    console.log("Error");
    console.log(e);
    errorMessage("An error has occured when fetching data of the item. Please refresh the page and try again.");
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Edit Item";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitItem(e, editItemPath));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Item Name Section
  let section = createSection(form, "Item Name");
  let input = document.createElement("input");
  input.name = "item-name";
  input.type = "text";
  input.id = "item-name";
  input.autocomplete = "off";
  input.value = name;
  input.required = true;
  section.appendChild(input);

  // Description Section
  section = createSection(form, "Description");
  let textarea = document.createElement("textarea");
  textarea.name = "description";
  textarea.id = "description";
  textarea.autocomplete = "off";
  textarea.value = description;
  textarea.spellcheck = true;
  section.appendChild(textarea);

  // Tag Section
  section = createSection(form, "Tag");

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    input = document.createElement("input");
    input.classList.add("tag-input");
    input.name = "tag";
    input.type = "text";
    input.value = tag;
    input.autocomplete = "off";
    section.appendChild(input);
  }

  let addTagButton = document.createElement("button");
  addTagButton.type = "button";
  addTagButton.id = "add-content";
  addTagButton.addEventListener("click", () =>
    addTagInput(addTagButton.parentElement)
  );
  section.appendChild(addTagButton);

  let img = document.createElement("img");
  img.src = addTagImgPath;
  addTagButton.appendChild(img);

  let p = document.createElement("p");
  p.innerText = "Add Tag";
  addTagButton.appendChild(p);

  // Form Control Section
  section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Update";
  section.appendChild(button);

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

async function editGroup() {
  let itemData, name, description, tags, groups;
  try {
    const response = await fetch(getPath(getItemPath, ownerId, id));

    itemData = await response.json();
    name = itemData.name;
    description = itemData.description;
    tags = itemData.tags;
    groups = itemData.groups;
  } catch (e) {
    console.log("Error");
    console.log(e);
    errorMessage("An error has occured when fetching data of the group. Please refresh the page and try again.");
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Edit Groups";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitItem(e, editItemPath, true));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Item Name Section
  let input = document.createElement("input");
  input.name = "item-name";
  input.type = "hidden";
  input.id = "item-name";
  input.value = name;
  input.disabled = true;
  form.appendChild(input);

  // Description Section
  let textarea = document.createElement("textarea");
  textarea.name = "description";
  textarea.id = "description";
  textarea.value = description;
  textarea.disabled = true;
  textarea.hidden = true;
  form.appendChild(textarea);

  // Tag Section
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    input = document.createElement("input");
    input.classList.add("tag-input");
    input.name = "tag";
    input.type = "hidden";
    input.value = tag;
    input.disabled = true;
    form.appendChild(input);
  }

  // Edit Groups Section
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    form.appendChild(createGroup(group.name, group.count, group.exp));
  }

  // Button to add another group
  const addGroupSection = document.createElement("section");
  addGroupSection.classList.add("pop-up-action");
  form.appendChild(addGroupSection);

  let addGroupButton = document.createElement("button");
  addGroupButton.id = "add-content";
  addGroupButton.type = "button";
  addGroupButton.addEventListener("click", () => {
    form.insertBefore(createGroup(), addGroupSection);
  });
  addGroupSection.appendChild(addGroupButton);

  let img = document.createElement("img");
  img.src = addTagImgPath;
  addGroupButton.appendChild(img);

  let p = document.createElement("p");
  p.innerText = "Add Group";
  addGroupButton.appendChild(p);

  // Form Control Section
  let section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Update";
  section.appendChild(button);

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

/**
 * @param {Event} e
 * @param {string} apiPath
 * @param {boolean} [editGroup=false]
 */
async function submitItem(e, apiPath, editGroup = false) {
  e.preventDefault();
  console.log("Checking Form Data");

  const formData = new FormData();
  /**@type {HTMLSelectElement} */
  let parentStorage = document.getElementById("parent-storage");
  /**@type {HTMLInputElement} */
  let itemName = document.getElementById("item-name");
  /**@type {HTMLTextAreaElement} */
  let description = document.getElementById("description");
  /**@type {HTMLCollectionOf<HTMLInputElement>} */
  let tags = document.getElementsByClassName("tag-input");

  /**@type {NodeListOf<HTMLInputElement>} */
  let groupNames = document.querySelectorAll('input[name="group-name"]');
  /**@type {NodeListOf<HTMLInputElement>} */
  let groupCounts = document.querySelectorAll('input[name="count"]');
  /**@type {NodeListOf<HTMLInputElement>} */
  let groupExps = document.querySelectorAll('input[name="exp"]');

  console.log(groupNames);
  console.log(groupCounts);
  console.log(groupExps);

  try {
    // Required fields (cannot be empty)
    formData.append("item-name", itemName.value);

    if (id) formData.append("id", id);
    if (ownerId) formData.append("owner-id", ownerId);

    formData.append("edit-group", editGroup);

    // Optional fields
    formData.append("description", description.value);

    if (parentStorage && parentStorage.value.length > 0) {
      let parentJson = JSON.parse(parentStorage.value);
      formData.append("parent-storage", parentJson.id);
      formData.append("parent-owner", parentJson.owner_id);
    }

    for (let i = 0; i < tags.length; i++) {
      /**@type {HTMLInputElement} */
      let tag = tags[i];
      if (tag.value.length > 0) formData.append("tag", tag.value);
    }

    if (editGroup) {
      if (
        groupNames.length != groupCounts.length ||
        groupNames.length != groupExps.length
      )
        throw "Groups input length doesn't match";

      for (let i = 0; i < groupNames.length; i++) {
        const groupName = groupNames[i].value;
        const groupCount = groupCounts[i].valueAsNumber;
        const groupExp = groupExps[i].value;

        formData.append(
          "group",
          JSON.stringify({
            name: groupName,
            count: groupCount,
            exp: groupExp,
          })
        );
      }
    }
  } catch (error) {
    alert("Error at inputs");
    console.log(error);
    return;
  }

  for (var pair of formData.entries()) {
    console.log(pair[0] + ", " + pair[1]);
  }

  try {
    const response = await fetch(apiPath, {
      method: "POST",
      body: formData
    });
    console.log(await response.text());

    if (response.status == 200) {
      togglePopUp(false);
      window.location.reload();
    } else {
      errorMessage("An error has occured when parsing the form. Please check if every input is vallid.");
    }
  } catch (e) {
    console.error(e);
  }
}

function cancelForm() {
  togglePopUp(false);
}

/**
 *
 * @param {boolean} open
 */
function togglePopUp(open = true) {
  console.log("Toggle pop-up");
  popUp.toggleAttribute("open", open);
}

/**
 *
 * @param {string} name
 * @param {int} count
 * @param {string} exp
 */
function createGroup(name = "", count = 0, exp = "") {
  let section = document.createElement("section");
  section.classList.add("pop-up-section");

  let p = document.createElement("p");
  p.innerText = "Group Section";
  section.appendChild(p);
  section.classList.add("group");

  let deleteButton = document.createElement("input");
  deleteButton.classList.add("delete-group-button");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => {
    section.remove();
  });
  section.appendChild(deleteButton);

  let nameText = document.createElement("p");
  nameText.innerText = "Name";
  section.appendChild(nameText);

  let nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.name = "group-name";
  nameInput.value = name;
  nameInput.required = true;
  section.appendChild(nameInput);

  let countText = document.createElement("p");
  countText.innerText = "Count";
  section.appendChild(countText);

  let countInput = document.createElement("input");
  countInput.type = "number";
  countInput.name = "count";
  countInput.value = count;
  countInput.required = true;
  countInput.min = 0;
  section.appendChild(countInput);

  let dateText = document.createElement("p");
  dateText.innerText = "Expiration Date";
  section.appendChild(dateText);

  let dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.name = "exp";
  dateInput.value = exp;
  dateInput.required = true;
  section.appendChild(dateInput);

  return section;
}

async function editPinned() {
  // Get Parent Storage option before any operation
  /**@type {JSON} */
  let json;
  try {
    const response = await fetch(allStoragePath);
    json = await response.json();
    console.log(json);
  } catch (e) {
    console.error(e);
    return;
  }

  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Edit Pinned Storage";

  // Create Form
  let form = document.createElement("form");
  form.addEventListener("submit", (e) => submitPinned(e));
  form.method = "post";
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // Pinned Storage Selection
  let section = createSection(form, "Pinned Storage");

  for (let i = 0; i < json.length; i++) {
    let obj = json[i];
    let checkbox = document.createElement("div");
    checkbox.classList.add("check-box-container");
    section.appendChild(checkbox);

    let input = document.createElement("input");
    input.type = "checkbox";
    input.id = obj.name;
    input.name = "pinned";
    input.value = obj.id;
    checkbox.appendChild(input);

    let label = document.createElement("label");
    label.htmlFor = obj.name;
    label.innerText = obj.name;
    checkbox.appendChild(label);
  }

  // Form Control Section
  section = document.createElement("section");
  section.classList.add("pop-up-action");
  form.appendChild(section);

  let button = document.createElement("button");
  button.id = "done-button";
  button.innerText = "Create";
  section.appendChild(button);
  form.addEventListener("submit", () => {
    /**@type {HTMLButtonElement} */
    let doneButton = document.getElementById("done-button");
    doneButton.disabled = true;
    setTimeout(() => {
      doneButton.disabled = false;
    }, 1000);
  });

  let cancelButton = document.createElement("button");
  cancelButton.id = "cancel-button";
  cancelButton.type = "button";
  cancelButton.innerText = "Cancel";
  cancelButton.addEventListener("click", cancelForm);
  section.appendChild(cancelButton);

  togglePopUp();
}

async function submitPinned(e) {
  e.preventDefault();

  const formData = new FormData();
  /**@type {NodeListOf<HTMLInputElement>}*/
  const checkedStorage = document.querySelectorAll(
    'input[name="pinned"]:checked'
  );

  for (let i = 0; i < checkedStorage.length; i++) {
    const pinned = checkedStorage[i].value;
    formData.append("pinned", pinned);
  }

  try {
    const response = await fetch("/api/pinned/edit", {
      method: "POST",
      body: formData,
    });
    console.log(await response.text());

    if (response.status === 200) {
      togglePopUp(false);
      window.location.reload();
    } else {
      errorMessage("An error occured when submiting the form. Please refresh the page and try again.");
    }
  } catch (e) {
    console.error(e);
  }
}

async function editPermission() {
  // Removing old forms
  /**@type {HTMLFormElement} */
  let oldForm = document.getElementById("pop-up-form");
  if (oldForm != null) oldForm.remove();

  /**@type {HTMLParagraphElement} */
  document.getElementById("pop-up-title").innerText = "Edit Permission";

  let container = document.createElement("div");
  container.id = "pop-up-form";
  popUp.append(container);

  let ownerText = document.createElement("p");
  ownerText.classList.add("permission-title");
  ownerText.innerText = "Owner";
  container.appendChild(ownerText);

  let editorText = document.createElement("p");
  editorText.classList.add("permission-title");
  editorText.innerText = "Editors";
  container.appendChild(editorText);

  try {
    const response = await fetch(getPath("/api/user/storage", ownerId, id));
    const userInfo = await response.json();
    const contents = userInfo.contents;
    console.log(userInfo);

    if (contents.length <= 1) editorText.style.display = "none";

    for (let i = 0; i < contents.length; i++) {
      const user = contents[i];

      let form = document.createElement("form");
      form.classList.add("user-info");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        let targetId = form.querySelector('input[name="user-id"]').value;
        let name = form.querySelector(".user-name").innerText;

        const formData = new FormData();
        formData.append("id", id);
        formData.append("owner-id", ownerId);
        formData.append("target-user", targetId);
        deletePermission(formData, name, form, user.id == userInfo.user_id);
      });

      if (user.id == ownerId) container.insertBefore(form, editorText);
      else container.appendChild(form);

      let icon = document.createElement("img");
      icon.classList.add("user-picture");
      icon.src = user.picture;
      form.appendChild(icon);

      let name = document.createElement("p");
      name.classList.add("user-name");
      name.innerText = user.name;
      form.appendChild(name);

      let email = document.createElement("p");
      email.classList.add("user-email");
      email.innerText = user.email;
      form.appendChild(email);

      let userId = document.createElement("input");
      userId.name = "user-id";
      userId.type = "hidden";
      userId.value = user.id;
      form.appendChild(userId);

      if (user.id != ownerId) {
        let deleteButton = document.createElement("input");
        deleteButton.classList.add("delete-user-button");
        deleteButton.type = "image";
        deleteButton.alt = "Delete User Permission";
        deleteButton.src = trashImgPath;
        form.appendChild(deleteButton);
      }
    }

    let addUser = document.createElement("button");
    addUser.id = "add-content";
    addUser.addEventListener("click", addPermission);
    container.appendChild(addUser);

    let img = document.createElement("img");
    img.src = addTagImgPath;
    addUser.appendChild(img);

    let p = document.createElement("p");
    p.innerText = "Add User";
    addUser.appendChild(p);
  } catch (e) {
    console.error(e);
    return;
  }

  togglePopUp();
}

/**
 *
 * @param {FormData} formData
 * @param {string} name
 * @param {HTMLFormElement} targetForm
 * @param {boolean} [userIsTarget=false]
 */
async function deletePermission(
  formData,
  name,
  targetForm,
  userIsTarget = false
) {
  let warningWindow = createWarningWindow(
    `Removing User: ${name}?`,
    "The user will lost its permission to view and edit all sub-storages and items if you remove this user."
  );

  let submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.innerText = "Remove";
  submitButton.id = "delete-button";
  warningWindow.appendChild(submitButton);
  submitButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/storage/permission/remove", {
        method: "POST",
        body: formData,
      });

      if (response.status == 200) {
        console.log("Delete Successfully");
        targetForm.remove();
        warningWindow.parentElement.remove();
        if (userIsTarget) window.location.replace("/");
      } else throw await response.text();
    } catch (error) {
      console.log(error);
    }
  });

  let closeWarning = document.createElement("button");
  closeWarning.type = "button";
  closeWarning.id = "cancel-button";
  closeWarning.addEventListener("click", () => {
    closeWarning.parentElement.parentElement.remove();
  });
  closeWarning.innerText = "Cancel";
  warningWindow.appendChild(closeWarning);
}

async function addPermission() {
  let warningWindow = createWarningWindow("Add Users");
  let form = document.createElement("form");
  warningWindow.appendChild(form);

  let emailInput = document.createElement("input");
  emailInput.name = "target-email";
  emailInput.type = "email";
  emailInput.classList.add("email-input");
  emailInput.required = true;
  emailInput.placeholder = "exmaple@mail.com";
  form.appendChild(emailInput);

  let submitEmail = document.createElement("input");
  submitEmail.type = "submit";
  submitEmail.value = "Add";
  submitEmail.id = "done-button";
  form.appendChild(submitEmail);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append(emailInput.name, emailInput.value);
    formData.append("id", id);
    formData.append("owner-id", ownerId);

    try {
      const response = await fetch("/api/storage/permission/add", {
        method: "POST",
        body: formData,
      });

      if (response.status === 200) {
        editPermission();
        warningWindow.parentElement.remove();
      } else {
        errorMessage("An error has occured when adding user permission. Please check if it is the correct email.");
      }
    } catch (error) {
      console.log(error);
    }
  });
}

function deleteContent() {
  const pathArray = window.location.pathname.split("/");
  const resource = pathArray[pathArray.length - 1];
  const title = document.getElementById("content-name").innerText;

  let warningWindow = createWarningWindow(
    `Deleting Storage: "${title}"?`,
    "All of its sub-storages and items will be deleted if you delete this storage."
  );

  let deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.innerText = "Delete";
  deleteButton.id = "delete-button";
  warningWindow.appendChild(deleteButton);
  deleteButton.addEventListener("click", async () => {
    try {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("owner-id", ownerId);

      const response = await fetch(`/api/${resource}/delete`, {
        method: "POST",
        body: formData,
      });

      if (response.status == 200) {
        console.log("Delete Successfully");
        window.location.replace("/");
      } else throw await response.text();
    } catch (error) {
      console.log(error);
    }
  });

  let closeWarning = document.createElement("button");
  closeWarning.type = "button";
  closeWarning.id = "cancel-button";
  closeWarning.addEventListener("click", () => {
    closeWarning.parentElement.parentElement.remove();
  });
  closeWarning.innerText = "Cancel";
  warningWindow.appendChild(closeWarning);
}

/**
 *
 * @param {HTMLElement} section
 */
function addTagInput(section) {
  const tag = document.createElement("input");
  tag.classList.add("tag-input");
  tag.type = "text";
  tag.name = "tag";
  section.insertBefore(tag, section.lastElementChild);
}
