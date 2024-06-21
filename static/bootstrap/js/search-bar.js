/**@type {HTMLInputElement} */
const searchBar = document.getElementById("search-bar");
/**@type {HTMLCollectionOf<Element>} */
const collectionList = document.getElementsByClassName("collection");
searchBar.addEventListener("input", () => {
    Array.from(collectionList).forEach(collection => {
      const name = collection.querySelector("p.collection-name");
      const display = name.innerText.toLowerCase().includes(searchBar.value.toLowerCase()) ? "" : "none";
      collection.style.display = display;
    });
})