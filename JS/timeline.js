import { auth, app } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { encryptData, decryptData } from "./encryption.js";

const db = getFirestore(app);
const entriesContainer = document.getElementById("entriesContainer");
const timelineEl = document.getElementById("timeline");
const totalAmountEl = document.getElementById("totalAmount");

export let currentUser = null;

// SETTINGS INPUTS
const settingsName =
    document.getElementById("settingsName");

const settingsEmail =
    document.getElementById("settingsEmail");

const settingsGender =
    document.getElementById("settingsGender");

const settingsAgeRange =
    document.getElementById("settingsAgeRange");

const settingsCurrency =
    document.getElementById("settingsCurrency");

const settingsBalance =
    document.getElementById("settingsBalance");

const settingsIncome =
    document.getElementById("settingsIncome");

const settingsGoal =
    document.getElementById("settingsGoal");

// BUTTONS
const saveSettingsBtn =
    document.getElementById("saveSettingsBtn");

const onboardingWarning =
    document.getElementById("onboardingWarning");

const goToOnboardingBtn =
    document.getElementById("goToOnboardingBtn");

// =======================
// TAGS
// =======================
const tagsContainer = document.getElementById("tagsContainer");
const addTagBtn = document.getElementById("addTagBtn");

let tagsData = [];

// =======================
// DANGER ZONE
// =======================

const deleteAccountBtn = document.getElementById("deleteAccountBtn");


// =======================
// AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await loadEntries(user.uid);
    scrollToBottom(true);
});

// =======================
// LOGOUT
// =======================
document.getElementById("btnLogout").onclick = async () => {
    await signOut(auth);
    window.location.href = "/index.html";
};


// =======================
// ADD ENTRY
// =======================
document.getElementById("btnAdd").onclick = async () => {
    const user = currentUser;

    if (!user) return;

    try {

        await loadEntries(user.uid);

        window.location.href = "/HTML/entry.html";

    } catch (error) {
        console.error(error);
    }
};


// =======================
// LOAD ENTRIES
// =======================
async function loadEntries(uid) {
    entriesContainer.innerHTML = "";

    const q = query(
        collection(db, "users", uid, "entries"),
        orderBy("date", "asc") // 🔼 MÁS ANTIGUO ARRIBA
    );

const snapshot = await getDocs(q);

    const totalAmount = snapshot.docs.reduce((sum, docItem) => {
        const data = docItem.data();
        return sum + (data.total || 0);
    }, 0);


    // COUNT NUMBER OF ENTRIES AND UPDATE USER DOC
    const entryCount = snapshot.size;
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { entryCount: entryCount }, { merge: true });

    // GET CURRENT BALANCE FROM USER DOC
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data();
    const currentBalance = userData.finance?.currentBalance;

    const finalTotal = currentBalance !== undefined ? currentBalance + totalAmount : totalAmount;
    totalAmountEl.textContent = `Total Amount: $ ${finalTotal}`;
    totalAmountCache = totalAmountEl.textContent;
    updateTotalVisibility();

    snapshot.forEach((docItem) => {
        const data = docItem.data();
        const entryId = docItem.id;
        const entryTotal = data.total || 0;

        const div = document.createElement("div");
        div.className = "entry";

        const formattedDate = new Date(
            data.date.seconds * 1000
        );

        div.innerHTML = `

            <div class="entry-header">

                <div class="entry-main-info">
                    <p class="entry-date">
                        ${formattedDate.toLocaleDateString()}
                    </p>

                    <p class="entry-total">
                        Total: $ ${entryTotal}
                    </p>
                </div>

                <button 
                    class="expand-btn"
                    onclick="toggleEntry('${entryId}')"
                    id="btn-${entryId}"
                >
                    ▾
                </button>

            </div>

            <div class="entry-details hidden" id="details-${entryId}">

                <div class="detail-section">
                    <strong>Notes:</strong>
                    <p>${decryptData(data.notes) || "No notes"}</p>
                </div>

                <div class="detail-section">
                    <strong>Items:</strong>

                    ${
                        data.items.map(item => `
                            <div class="item-row">

                                <div style="display:flex; flex-direction:column; gap:6px;">

                                    <span>
                                        ${item.tag} / ${item.subtag}
                                    </span>

                                    ${
                                        item.receipt
                                        ? `
                                            <div>

                                                <p style="
                                                    margin:0 0 6px 0;
                                                    font-size:12px;
                                                    color:gray;
                                                ">
                                                    ${item.receipt.name}
                                                </p>

                                                <a 
                                                    href="${item.receipt.url}" 
                                                    target="_blank"
                                                >
                                                    <img 
                                                        src="${item.receipt.url}"
                                                        style="
                                                            width:90px;
                                                            height:90px;
                                                            object-fit:cover;
                                                            border-radius:10px;
                                                            border:1px solid #ccc;
                                                            cursor:pointer;
                                                            box-shadow:0 2px 6px rgba(0,0,0,0.15);
                                                        "
                                                    />
                                                </a>

                                            </div>
                                        `
                                        : ''
                                    }

                                </div>

                                <span>
                                    ${
                                        item.minus
                                            ? "-$" + item.minus
                                            : "+$" + item.plus
                                    }
                                </span>

                            </div>
                        `).join("")
                    }

                </div>

                <div class="entry-actions">
                    <button onclick="viewEntry('${entryId}')">
                        View / Edit
                    </button>

                    <button onclick="deleteEntry('${entryId}')">
                        Delete
                    </button>
                </div>

            </div>
        `;

        entriesContainer.appendChild(div);
    });
}

window.toggleEntry = (id) => {

    const details = document.getElementById(`details-${id}`);
    const btn = document.getElementById(`btn-${id}`);

    details.classList.toggle("hidden");

    btn.textContent =
        details.classList.contains("hidden")
            ? "▾"
            : "▴";
};

// =======================
// VIEW / EDIT
// =======================
window.viewEntry = (id) => {
    window.location.href = `/HTML/entry.html?id=${id}`;
};


// =======================
// DELETE
// =======================
window.deleteEntry = async (id) => {
    if (!confirm("Delete this entry?")) return;

    try {
        await deleteDoc(
            doc(db, "users", currentUser.uid, "entries", id)
        );

        loadEntries(currentUser.uid);
        toggleFixedBottom();

    } catch (error) {
        console.error(error);
    }
};

// =======================
// NAVIGATION
// =======================

document.getElementById("settings").onclick = async () => {
    openModal(0);
    await loadUserSettings();
};

async function loadUserSettings() {

    try {

        const user = auth.currentUser;

        if (!user) return;

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);

        if (!userSnap.exists()) return;

        const data = userSnap.data();

        // BASIC
        settingsName.value =
            decryptData(data.name) || "";

        settingsEmail.value =
            decryptData(data.email) || "";

        settingsCurrency.value =
            data.currency || "USD";

        // PROFILE
        settingsGender.value =
            data.profile?.gender || "no";

        settingsAgeRange.value =
            data.profile?.ageRange || "no";

        // FINANCE
        settingsBalance.value =
            data.finance?.currentBalance || 0;

        settingsIncome.value =
            data.finance?.incomeFrequency || "no";

        settingsGoal.value =
            data.finance?.financialGoal || "no";

        // ONBOARDING
        if (data.onboardingCompleted === false) {

            onboardingWarning.classList.remove("hidden");

        } else {

            onboardingWarning.classList.add("hidden");
        }

    } catch (error) {

        console.error(error);
    }

    await loadTagsSettings();
}

saveSettingsBtn.onclick = async () => {

    try {

        const user = auth.currentUser;

        if (!user) return;

        await updateDoc(
            doc(db, "users", user.uid),
            {

                name: encryptData(settingsName.value),

                currency: settingsCurrency.value,

                profile: {

                    gender: settingsGender.value,
                    ageRange: settingsAgeRange.value

                },

                finance: {

                    currentBalance:
                        Number(settingsBalance.value || 0),

                    incomeFrequency:
                        settingsIncome.value,

                    financialGoal:
                        settingsGoal.value

                }

            }
        );

        setTimeout(() => {
            loadEntries(currentUser.uid);
            toggleFixedBottom();
            closeModal();
        }, 100);

    } catch (error) {

        console.error(error);
        alert("Error updating settings");
    }

    try {

        // =========================
        // SAVE TAGS
        // =========================
        for (const tag of tagsData) {

            await setDoc(
                doc(db, "users", auth.currentUser.uid, "tags", tag.id),
                {
                    color: tag.color,
                    name: tag.name
                }
            );

            // SAVE SUBTAGS
            for (const subtag of tag.subtags) {

                await setDoc(
                    doc(
                        db,
                        "users",
                        auth.currentUser.uid,
                        "tags",
                        tag.id,
                        "subtags",
                        subtag.id
                    ),
                    {
                        name: subtag.name
                    }
                );
            }
        }

    } catch (error) {
        console.error(error);
        alert("Error saving settings");
    }
};

goToOnboardingBtn.onclick = () => {

    window.location.href =
        "/HTML/onboarding.html";
};

// =======================
// TAGS - SETTINGS
// =======================
async function loadTagsSettings() {
    try {
        tagsContainer.innerHTML = "";

        const tagsSnapshot = await getDocs(
            collection(db, "users", auth.currentUser.uid, "tags")
        );

        tagsData = [];

        for (const tagDoc of tagsSnapshot.docs) {

            const tag = {
                id: tagDoc.id,
                ...tagDoc.data(),
                subtags: []
            };

            const subtagsSnapshot = await getDocs(
                collection(
                    db,
                    "users",
                    auth.currentUser.uid,
                    "tags",
                    tag.id,
                    "subtags"
                )
            );

            subtagsSnapshot.forEach((subDoc) => {
                tag.subtags.push({
                    id: subDoc.id,
                    name: subDoc.data().name
                });
            });

            tag.color = normalizeColor(tag.color);

            tagsData.push(tag);
        }

        renderTags();

    } catch (error) {
        console.error(error);
    }
}

window.saveTag = saveTag;

async function saveTag(tagId) {

    try {

        const user = auth.currentUser;

        const input =
            document.getElementById(
                `tag-name-${tagId}`
            );

        await updateDoc(
            doc(
                db,
                "users",
                user.uid,
                "tags",
                tagId
            ),
            {
                name: input.value
            }
        );

        alert("Tag updated");

    } catch (error) {

        console.error(error);
    }
}

window.deleteTag = deleteTag;

async function deleteTag(tagId) {

    try {

        const confirmed =
            confirm("Delete this tag?");

        if (!confirmed) return;

        const user = auth.currentUser;

        await deleteDoc(
            doc(
                db,
                "users",
                user.uid,
                "tags",
                tagId
            )
        );

        await loadTagsSettings();

    } catch (error) {

        console.error(error);
    }
}

addTagBtn.onclick = () => {

    tagsData.unshift({
        id: crypto.randomUUID(),
        name: "New Tag",
        color: "#000000",
        subtags: []
    });

    renderTags();
};


window.deleteSubtag = deleteSubtag;

async function deleteSubtag(
    tagId,
    subtagId
) {

    try {

        const user = auth.currentUser;

        await deleteDoc(
            doc(
                db,
                "users",
                user.uid,
                "tags",
                tagId,
                "subtags",
                subtagId
            )
        );

        await loadTagsSettings();

    } catch (error) {

        console.error(error);
    }
}

window.removeTag = async (index) => {

    const confirmed =
        confirm("Delete this tag?");

    if (!confirmed) return;

    const tag = tagsData[index];

    try {

        // DELETE SUBTAGS
        for (const sub of tag.subtags) {

            await deleteDoc(
                doc(
                    db,
                    "users",
                    auth.currentUser.uid,
                    "tags",
                    tag.id,
                    "subtags",
                    sub.id
                )
            );
        }

        // DELETE TAG
        await deleteDoc(
            doc(
                db,
                "users",
                auth.currentUser.uid,
                "tags",
                tag.id
            )
        );

        tagsData.splice(index, 1);

        renderTags();

    } catch (error) {

        console.error(error);
    }
};

window.addSubtag = (index) => {

    tagsData[index].subtags.push({
        id: crypto.randomUUID(),
        name: "New Subtag"
    });

    renderTags();
};

window.removeSubtag = async (tagIndex, subIndex) => {

    try {

        const subtag =
            tagsData[tagIndex].subtags[subIndex];

        await deleteDoc(
            doc(
                db,
                "users",
                auth.currentUser.uid,
                "tags",
                tagsData[tagIndex].id,
                "subtags",
                subtag.id
            )
        );

        tagsData[tagIndex]
            .subtags.splice(subIndex, 1);

        renderTags();

    } catch (error) {

        console.error(error);
    }
};

window.updateTagName = (index, value) => {
    tagsData[index].name = value;
};

window.updateTagColor = (index, value) => {

    // FORZAR HEX 6 DIGITOS
    tagsData[index].color =
        normalizeColor(value).toLowerCase();

};

window.updateSubtag = (tagIndex, subIndex, value) => {

    tagsData[tagIndex]
        .subtags[subIndex]
        .name = value;
};

function normalizeColor(color) {

    if (!color)
        return "#888888";

    color = color.trim();

    // #RRGGBB
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return color.toLowerCase();
    }

    // #RGB
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) {

        return (
            "#" +
            color[1] + color[1] +
            color[2] + color[2] +
            color[3] + color[3]
        ).toLowerCase();
    }

    return "#888888";
}


function renderTags() {

    tagsContainer.innerHTML = "";

    tagsData.forEach((tag, index) => {

        const row = document.createElement("div");
        row.className = "tags-row";

        row.innerHTML = `

            <!-- TAG NAME -->
            <input
                type="text"
                value="${tag.name}"
                onchange="updateTagName(${index}, this.value)"
            >

            <!-- COLOR -->
            <input
                type="color"
                value="${normalizeColor(tag.color)}"
                data-index="${index}"
                class="tag-color-input"
            >

            <!-- SUBTAGS -->
            <div class="subtags-inline">

                ${tag.subtags.map((sub, subIndex) => `
                    
                    <div class="subtag-chip">

                        <input
                            type="text"
                            value="${sub.name}"
                            onchange="updateSubtag(${index}, ${subIndex}, this.value)"
                        >

                        <button onclick="removeSubtag(${index}, ${subIndex})">
                            ✕
                        </button>

                    </div>

                `).join("")}

                <button
                    class="mini-add-btn"
                    onclick="addSubtag(${index})"
                >
                    + Subtag
                </button>

            </div>

            <!-- ACTIONS -->
            <div class="tag-actions">

                <button
                    class="delete-btn"
                    onclick="removeTag(${index})"
                >
                    Delete
                </button>

            </div>

        `;

        tagsContainer.appendChild(row);

        const colorInput = row.querySelector(".tag-color-input");

        colorInput.addEventListener("input", (e) => {

            const i = Number(e.target.dataset.index);

            tagsData[i].color = e.target.value;

        });
    });
}


// ========================
// DANGER ZONE
// =======================
deleteAccountBtn.onclick = async () => {

    const confirmed =
        confirm("This will delete your account and all your data. Are you sure?");
    
    if (!confirmed) return;

    try {
        // DELETE USER DOC
        await deleteDoc(
            doc(db, "users", currentUser.uid)
        );
        // DELETE AUTH ACCOUNT
        await auth.currentUser.delete();
        alert("Account deleted");
        window.location.href = "/index.html";
    } catch (error) {
        console.error(error);
        alert("Error deleting account. Please try again.");
    }
};



// =======================
// SCROLL TO BOTTOM
// =======================
document.getElementById("btnScrollBottom").onclick = () => {
    scrollToBottom(true);
};

const btnScroll = document.getElementById("btnScrollBottom");

window.addEventListener("scroll", () => {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10) {
        btnScroll.style.opacity = "0";
        btnScroll.style.pointerEvents = "none";
    } else {
        btnScroll.style.opacity = "1";
        btnScroll.style.pointerEvents = "auto";
    }
});

function scrollToBottom(smooth = true) {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: smooth ? "smooth" : "auto"
  });
}


const element = document.getElementById("totalAmountContainer");
function toggleFixedBottom() {
  const body = document.documentElement;
  const hasScroll = body.scrollHeight > body.clientHeight;

  if (hasScroll) {
    element.classList.add("fixed-bottom");
  } else {
    element.classList.remove("fixed-bottom");
  }
}

const showTotalBtn =
    document.getElementById("toggleTotalAmount");

let totalVisible =
    localStorage.getItem("totalVisible") !== "false";

let totalAmountCache = "";

function updateTotalVisibility() {

    totalAmountEl.textContent =
        totalVisible
            ? totalAmountCache
            : "Total Amount: $ ---";

    showTotalBtn.textContent =
        totalVisible
            ? "Hide"
            : "Show";
}

showTotalBtn.onclick = () => {

    totalVisible = !totalVisible;

    localStorage.setItem(
        "totalVisible",
        totalVisible
    );

    updateTotalVisibility();
};


// =======================
// SUBMENU
// ======================
const toggleBtn = document.getElementById("btnSmartToggle");
const menu = document.getElementById("smartMenu");

toggleBtn.onclick = () => {
    menu.classList.toggle("active");

    toggleBtn.textContent = menu.classList.contains("active")
        ? "Smart Tools ▴"
        : "Smart Tools ▾";
};

document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
        menu.classList.remove("active");
        toggleBtn.textContent = "Smart Tools ▾";
    }
});



// Ejecutar al cargar
window.addEventListener("load", toggleFixedBottom);
// Ejecutar al cambiar tamaño
window.addEventListener("resize", toggleFixedBottom);
// Ejecutar al hacer scroll
window.addEventListener("scroll", toggleFixedBottom);

// =======================
// SMART TOOLS CODE
// =======================

import {
    predictFuture,
} from "./tools/future.js";

import {
    setupSearchInput,
    startSearch,
    loadTagFilters,
    clearFilters
} from "./tools/search.js";

import {
    loadInsights
} from "./tools/spending.js";

import {
    loadComparison
} from "./tools/comparison.js";

const modalFuture = document.getElementById("modalFuture");
const modalSearch = document.getElementById("modalSearch");
const modalSpending = document.getElementById("modalSpending");
const modalComparison = document.getElementById("modalComparison");
const modalSettings = document.getElementById("modalSettings");

const modalContentFuture = document.getElementById("modalContentFuture");
const modalContentSearch = document.getElementById("modalContentSearch");
const modalContentSpending = document.getElementById("modalContentSpending");
const modalContentComparison = document.getElementById("modalContentComparison");
const modalContentSettings = document.getElementById("modalContentSettings");


export async function getUserEntries(uid) {
    try {
        const q = query(
            collection(db, "users", uid, "entries"),
            orderBy("date", "asc") // 🔥 IMPORTANTE
        );

        const snapshot = await getDocs(q);

        const entries = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            entries.push({
                id: docSnap.id,
                ...data
            });
        });

        return entries;

    } catch (error) {
        console.error("Error getting entries:", error);
        return [];
    }
}

// =======================
// MODAL
// =======================

function openModal(section) {
    if (section == 0){
        modalContentSettings.classList.remove("hidden");
        modalSettings.classList.remove("hidden");
    }else
        if (section == 1) {
        modalContentFuture.classList.remove("hidden");
        modalFuture.classList.remove("hidden");
    } else if (section == 2) {
        modalContentSearch.classList.remove("hidden");
        modalSearch.classList.remove("hidden");
    } else if (section == 3) {
        modalContentSpending.classList.remove("hidden");
        modalSpending.classList.remove("hidden");
    } else if (section == 4) {
        modalContentComparison.classList.remove("hidden");
        modalComparison.classList.remove("hidden");
    }
}

function closeModal() {
    modalFuture.classList.add("hidden");
    modalSearch.classList.add("hidden");
    modalSpending.classList.add("hidden");
    modalComparison.classList.add("hidden");
    modalSettings.classList.add("hidden");
}

window.closeModal = closeModal;

// cerrar al hacer click afuera
modalSettings.addEventListener("click", (e) => {
    if (e.target === modalSettings) closeModal();
});
modalFuture.addEventListener("click", (e) => {
    if (e.target === modalFuture) closeModal();
});
modalSearch.addEventListener("click", (e) => {
    if (e.target === modalSearch) closeModal();
});
modalSpending.addEventListener("click", (e) => {
    if (e.target === modalSpending) closeModal();
});
modalComparison.addEventListener("click", (e) => {
    if (e.target === modalComparison) closeModal();
});

// =======================
// SIMULATIONS
// =======================

// =======================
// VERIFICATION
// =======================
async function verificationForSimulation(uid, minEntries = 3) {
    // let simulationOK = verificationForSimulation(currentUser, N);
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    const count = snap.data().entryCount || -1;

    if (count >= minEntries) return true;

    if (count === -1) {
        alert("User data not found");
        return false;
    }

    alert("No tienes suficientes entries "+count+" (min: "+minEntries+")");
    return false;
}

// =======================
// SIMULATE THE FUTURE
// =======================
async function openFuture() {
    const simulationOK = await verificationForSimulation(currentUser.uid, 5);
    if (!simulationOK){
        closeModal();
    }else{
        openModal(1);
    }
}

window.openFuture = openFuture;

// =======================
// SEARCH
// =======================
async function openSearch() {
    const simulationOK = await verificationForSimulation(currentUser.uid, 1);
    if (!simulationOK){
        closeModal();
    }else{
        openModal(2);
        setupSearchInput();
        loadTagFilters();
    }
}

window.openSearch = openSearch;

// =======================
// Spending Insights
// =======================
async function openSpending() {
    const simulationOK = await verificationForSimulation(currentUser.uid, 3);
    if (!simulationOK){
        closeModal();
    }else {
        openModal(3);
        loadInsights();
    }
}

window.openSpending = openSpending;

// =======================
// Insights Comparison
// =======================
async function openComparison() {
    const simulationOK = await verificationForSimulation(currentUser.uid, 3);
    if (!simulationOK){
        closeModal();
    }else {
        openModal(4);
        loadComparison();
    }
}

window.openComparison = openComparison;