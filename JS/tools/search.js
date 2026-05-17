import {
    getUserEntries,
    currentUser
} from "../timeline.js";

import { encryptData, decryptData } from "../encryption.js";

let searchKeywords = [];

let selectedTags = new Set();
let selectedSubtags = new Set();

export function setupSearchInput() {
    const input = document.getElementById("searchInput");

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            const value = input.value.trim().toLowerCase();

            if (!value || searchKeywords.includes(value)) return;

            searchKeywords.push(value);

            renderSearchTags();
            runLiveSearch();

            input.value = "";
        }
    });
}

export async function loadTagFilters() {

    const entries = await getUserEntries(currentUser.uid);

    const tagSet = new Set();
    const subtagSet = new Set();

    entries.forEach(e => {
        e.items.forEach(i => {
            tagSet.add(i.tag);
            subtagSet.add(i.subtag);
        });
    });

    renderPills("tagFilter", tagSet, selectedTags);
    renderPills("subtagFilter", subtagSet, selectedSubtags);
}

function renderPills(containerId, values, selectedSet) {

    const container = document.getElementById(containerId);
    container.innerHTML = "";

    values.forEach(value => {

        const pill = document.createElement("div");
        pill.className = "pill";
        pill.textContent = value;

        if (selectedSet.has(value)) {
            pill.classList.add("active");
        }

        pill.onclick = () => {

            if (selectedSet.has(value)) {
                selectedSet.delete(value);
                pill.classList.remove("active");
            } else {
                selectedSet.add(value);
                pill.classList.add("active");
            }

            runLiveSearch();
        };

        container.appendChild(pill);
    });
}

function renderSearchTags() {
    const container = document.getElementById("searchTags");

    container.innerHTML = "";

    searchKeywords.forEach((word, index) => {
        const tag = document.createElement("div");
        tag.className = "tag-pill";

        tag.innerHTML = `
            ${word}
            <span onclick="removeKeyword(${index})">×</span>
        `;

        container.appendChild(tag);
    });
}

window.removeKeyword = (index) => {
    searchKeywords.splice(index, 1);
    renderSearchTags();
    runLiveSearch();
};

export async function startSearch() {

    const entries = await getUserEntries(currentUser.uid);

    const results = entries.filter(entry => {

        const note = (decryptData(entry.notes) || "").toLowerCase();

        // Keywords
        const matchKeyword = searchKeywords.some(word =>
            note.includes(word)
        );

        // Tags/subtags
        const matchItems = entry.items.some(item => {

            return (
                selectedTags.has(item.tag) ||
                selectedSubtags.has(item.subtag)
            );
        });

        // OR GLOBAL
        return (
            matchKeyword ||
            matchItems ||
            (searchKeywords.length === 0 &&
             selectedTags.size === 0 &&
             selectedSubtags.size === 0)
        );
    });

    renderSearchResults(results);
}

export function clearFilters() {

    selectedTags.clear();
    selectedSubtags.clear();
    searchKeywords = [];

    document.getElementById("searchInput").value = "";

    renderSearchTags();
    loadTagFilters();

    runLiveSearch(); // AUTO SEARCH
}

window.clearFilters = clearFilters;

async function runLiveSearch() {

    const entries = await getUserEntries(currentUser.uid);

    const results = entries.filter(entry => {

        const note = (decryptData(entry.notes) || "").toLowerCase();

        // AND KEYWORDS
        const matchKeywords =
            searchKeywords.length === 0 ||
            searchKeywords.every(word => note.includes(word));

        // AND TAGS
        const entryTags = new Set(entry.items.map(i => i.tag));
        const matchTags =
            selectedTags.size === 0 ||
            [...selectedTags].every(tag => entryTags.has(tag));

        // AND SUBTAGS
        const entrySubtags = new Set(entry.items.map(i => i.subtag));
        const matchSubtags =
            selectedSubtags.size === 0 ||
            [...selectedSubtags].every(sub => entrySubtags.has(sub));

        // AND GLOBAL
        return matchKeywords && matchTags && matchSubtags;
    });

    renderSearchResults(results);
}

function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    return Array.from(select.selectedOptions).map(opt => opt.value);
}

function renderSearchResults(entries) {

    const container = document.getElementById("searchResults");

    container.innerHTML = "";

    if (entries.length === 0) {
        container.innerHTML = `
            <p style="opacity:0.6;">No results found</p>
        `;
        return;
    }

    entries.forEach(entry => {

        const div = document.createElement("div");
        div.className = "simulation-entry";

        const date = entry.date.toDate();

        div.innerHTML = `
            <div class="entry-date">
                ${date.toLocaleDateString()}
            </div>

            <div class="tags-preview">
                ${entry.items.map(i => `${i.tag}/${i.subtag}`).join(", ")}
            </div>

            <div class="notes">
                Notes: ${decryptData(entry.notes) || "-"}
            </div>

            <br>

            <button onclick="viewEntryFromSearch('${entry.id}')">
                View / Edit
            </button>
        `;

        container.appendChild(div);
    });

    // Scroll to top on new results
    container.scrollTop = 0;
}

document.getElementById("searchResults").innerHTML = `
    <p style="opacity:0.6;">No filters applied</p>
`;

window.viewEntryFromSearch = (id) => {
    window.location.href = `/HTML/entry.html?id=${id}`;
};