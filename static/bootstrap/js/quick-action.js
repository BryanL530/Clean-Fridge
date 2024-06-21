/** @type {HTMLDivElement} */
const popUp = document.getElementById("pop-up");
/**@type {HTMLDivElement} */
const mode = document.getElementById("mode");
/**@type {HTMLParagraphElement} */
const popTitle = document.getElementById("pop-up-title");

const items = document.getElementsByClassName("content");
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  item.addEventListener("click", () => {
    const id = item.querySelector('input[name="id"]').value;
    const owner = item.querySelector('input[name="owner"]').value;
    quickAction(id, owner);
  });
}

async function editQuick() {
  const itemDataList = await getUserItemList();
  if (!itemDataList) return;

  popTitle.innerText = "Edit Quick";
  document.getElementById("pop-up-form")?.remove();

  // CREATE form
  const form = document.createElement("form");
  form.id = "pop-up-form";
  popUp.append(form);

  // List Quick Items
  const section = createSection(form, "Selected Quick Items");
  for (let i = 0; i < itemDataList.length; i++) {
    const itemData = itemDataList[i];
    const checkbox = document.createElement("div");
    checkbox.classList.add("check-box-container");
    section.appendChild(checkbox);

    let input = document.createElement("input");
    input.type = "checkbox";
    input.id = itemData.name;
    input.name = "quick";
    input.value = itemData.id;
    checkbox.appendChild(input);

    let label = document.createElement("label");
    label.htmlFor = itemData.name;
    label.innerText = itemData.name;
    checkbox.appendChild(label);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // CREATE form data
    const formData = new FormData();
    Array.from(
      form.querySelectorAll("input:checked"),
      (input) => input.value
    ).forEach((id) => formData.append("quick", id));

    try {
      const response = await fetch(editQuickPath, {
        method: "POST",
        body: formData,
      })

      if (response.status === 200)
        window.location.reload();
      else
        throw await response.text();
    } catch (error) {
      console.log(error);
      errorMessage(errorOnPost);
    }
  });
  formControlSection(form, "Update");

  popUp.toggleAttribute("open", true);
}

async function quickAction(id, owner) {
  if (!mode.hasAttribute("remove")) quickAdd(id, owner);
  else quickRemove(id, owner);
}

async function quickAdd(id, owner) {
  popTitle.innerText = "Quick Add";
  document.getElementById("pop-up-form")?.remove();

  // CREATE form
  const form = document.createElement("form");
  form.id = "pop-up-form";
  popUp.appendChild(form);

  const groupName = createSection(form, "Group Name");
  const nameInput = document.createElement("input");
  nameInput.name = "name";
  nameInput.type = "text";
  nameInput.autocomplete = "off";
  nameInput.required = true;
  groupName.appendChild(nameInput);

  const groupCount = createSection(form, "Count");
  const countInput = document.createElement("input");
  countInput.name = "count";
  countInput.type = "number";
  countInput.value = 1;
  countInput.min = 1;
  countInput.required = true;
  groupCount.appendChild(countInput);

  const groupDate = createSection(form, "Expiration Date");
  const dateInput = document.createElement("input");
  dateInput.name = "exp";
  dateInput.type = "date";
  dateInput.required = true;
  groupDate.appendChild(dateInput);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    appendGroup(owner, id, {
      name: nameInput.value,
      count: countInput.valueAsNumber,
      exp: dateInput.value,
    });
  });
  formControlSection(form, "Create");

  popUp.toggleAttribute("open", true);
}

async function quickRemove(id, owner) {
  const itemData = await getItem(owner, id);
  if (!itemData) return;

  const maxCount = itemCount(itemData);
  if (maxCount === 0) {
    errorMessage("There are no items to remove!");
    return;
  }

  popTitle.innerText = "Quick Remove";
  document.getElementById("pop-up-form")?.remove();

  // CREATE form
  const form = document.createElement("form");
  form.id = "pop-up-form";
  popUp.appendChild(form);

  // FETCH Item & SORT Groups
  const itemName = createSection(form, "Item Name");
  const nameInput = document.createElement("input");
  nameInput.name = "name";
  nameInput.type = "text";
  nameInput.value = itemData.name;
  nameInput.disabled = true;
  itemName.appendChild(nameInput);

  const groupCount = createSection(form, "Count");
  const countInput = document.createElement("input");
  countInput.name = "count";
  countInput.type = "number";
  countInput.value = 1;
  countInput.min = 1;
  countInput.max = maxCount;
  countInput.required = true;
  groupCount.appendChild(countInput);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await removeItemCount(owner, id, countInput.valueAsNumber);
    window.location.reload();
  });
  formControlSection(form, "Remove");
  const doneButton = document.getElementById("done-button");
  doneButton.id = "delete-button";

  popUp.toggleAttribute("open", true);
}
