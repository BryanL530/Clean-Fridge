//const getItemPath = "/api/item";
//const createItemPath = "/api/item/create";
//const editItemPath = "/api/item/edit";
const getAllItemPath = "/api/item/all";
const editQuickPath = "/api/quick/edit";

async function getItem(owner, id) {
  try {
    const response = await fetch(getPath(getItemPath, owner, id));
    return await response.json();
  } catch (error) {
    errorMessage(errorOnFetch);
    return null;
  }
}

async function getUserItemList() {
  try {
    const response = await fetch(getAllItemPath);
    if (response.status === 200)
      return await response.json();
    else
      throw await response.text();
  } catch (error) {
    console.log(error);
    errorMessage(errorOnFetch);
    return null;
  }
}

async function appendGroup(owner, id, group) {
  const itemData = await getItem(owner, id);
  if (!itemData) return;
  itemData.groups.push(group);
  return await editGroup(itemData);
}

async function removeItemCount(owner, id, count) {
  const itemData = await getItem(owner, id);
  if (!itemData) return;
  sortGroup(itemData.groups);

  // Remove items base on count & remove groups with 0
  const groups = itemData.groups
  let i;
  for (i = 0; i < groups.length; i++) {
    if (count < 1) break;

    const max = Math.min(groups[i].count, count);
    console.log(max);
    groups[i].count -= max;
    count -= max;
  }
  itemData.groups = groups.slice(i);
  return await editGroup(itemData);
}

async function editGroup(itemData) {
  try {
    const formData = itemFormData(itemData, true);
    const response = await fetch(editItemPath, {
      method: "POST",
      body: formData,
    });

    const status = response.status;
    if (status === 200) window.location.reload();
    else throw status;
  } catch (error) {
    errorMessage(errorOnPost);
    return error;
  }
}

function itemFormData(itemData, editGroup) {
  const formData = new FormData();
  formData.append("id", itemData.id);
  formData.append("owner-id", itemData.owner_id);
  formData.append("item-name", itemData.name);
  formData.append("description", itemData.description);
  formData.append("edit-group", editGroup);

  itemData.tags.forEach((tag) => formData.append("tag", tag));
  itemData.groups.forEach((group) =>
    formData.append("group", JSON.stringify(group))
  );
  return formData;
}

function itemCount(itemData) {
  let count = 0;
  itemData.groups.forEach(group => count += group.count);
  return count;
}

function sortGroup(group) {
  group.sort((a, b) => groupComparator(a, b));
}

function groupComparator(groupA, groupB) {
  const expCompare = groupA.exp.localeCompare(groupB.exp);
  if (expCompare != 0) return expCompare;

  const countCompare = groupA.count - groupB.count;
  if (countCompare != 0) return countCompare;

  return groupA.name.localeCompare(groupB.name);
}
