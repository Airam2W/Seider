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

import { getCurrencySymbol } from "./utils.js";

import {
    initI18n,
    translatePage,
    t,
    translateStoredLabel,
    getCurrencyName,
    syncLanguageFromUser,
    getStoredLanguageValue,
    getLanguage,
    setLanguage
} from "./i18n.js";

import {
    openCustomModal,
    closeCustomModal,
    customAlert,
    customConfirm
} from "./customModals.js";

import {
    showLoading,
    hideLoading
} from "./loading.js";

showLoading();

await initI18n();
translatePage();

document.title = t("titles.timeline");

const db = getFirestore(app);
const entriesContainer = document.getElementById("entriesContainer");
const timelineEl = document.getElementById("timeline");
const totalAmountEl = document.getElementById("totalAmount");
export let currencyFromUserGlobal = "...";

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
// Currency Exchange Table
// =======================
const btnExchangeTable = document.getElementById("btnExchangeTable");
const modalExchange = document.getElementById("modalExchange");
const modalContentExchange = document.getElementById("modalContentExchange");
const exchangeTable = document.getElementById("exchangeTable");


// =======================
// AUTH CHECK
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    await syncLanguageFromUser(userSnap.data() || {});
    translatePage();
    updateDarkModeButton();
    updateTotalVisibility();

    await loadEntries(user.uid);
    scrollToBottom(true);
    hideLoading();
});

// =======================
// Language
// =======================

const languageSelect = document.getElementById("settingsLanguage");
const enOption = document.getElementById("en");
const esOption = document.getElementById("es");
const jaOption = document.getElementById("ja");
const koOption = document.getElementById("ko");



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
        orderBy("date", "asc") // 🔼 OLDEST UP
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
    const currencyFromUser = userData.currency || "USD";
    currencyFromUserGlobal = currencyFromUser;

    const finalTotal = currentBalance !== undefined ? currentBalance + totalAmount : totalAmount;
    let finalTotalSimbol = "+";
    if (finalTotal < 0) {
        finalTotalSimbol = "-";
    }

    totalAmountEl.textContent = t("timeline.totalAmount", {
        value: `${finalTotalSimbol} ${getCurrencySymbol(currencyFromUser)}${Math.abs(finalTotal).toFixed(2)} ${currencyFromUser}`
    });
    totalAmountCache = totalAmountEl.textContent;
    updateTotalVisibility();

    snapshot.forEach((docItem) => {
        const data = docItem.data();
        const entryId = docItem.id;
        const entryTotal = data.total || 0;

        let entryTotalSimbol = "+";
        if (entryTotal < 0) {
            entryTotalSimbol = "-";
        }

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
                        ${t("timeline.entryTotal", {
            value: `${entryTotalSimbol} ${getCurrencySymbol(currencyFromUser)}${Math.abs(entryTotal).toFixed(2)} ${currencyFromUser}`
        })}
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
                    <strong data-i18n="labels.notes">Notes:</strong>
                    <p>${decryptData(data.notes) || t("timeline.noNotes")}</p>
                </div>

                <div class="detail-section">
                    <strong data-i18n="labels.items">Line Items:</strong>

                    ${data.items.map(item => `
                            <div class="item-row">

                                <div style="display:flex; flex-direction:column; gap:6px;">

                                    <span>
                                        ${translateStoredLabel(item.tag)} / ${translateStoredLabel(item.subtag)}
                                    </span>

                                    ${item.receipt
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
                                    ${item.minus
                ? "- " + getCurrencySymbol(currencyFromUser) + item.minus + " " + currencyFromUser
                : "+ " + getCurrencySymbol(currencyFromUser) + item.plus + " " + currencyFromUser
            }
                                </span>

                            </div>
                        `).join("")
            }

                </div>

                <div class="entry-actions">
                    <button onclick="viewEntry('${entryId}')">
                        ${t("buttons.viewEdit")}
                    </button>

                    <button onclick="deleteEntry('${entryId}')">
                        ${t("buttons.delete")}
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
    if(!customConfirm({
        title: t("alerts.deleteEntry"),
        message: t("alerts.deleteEntryMessage"),
        icon: "⚠️",
        confirmText: t("buttons.confirm"),
        cancelText: t("buttons.cancel"),
        danger: false,
        onConfirm: () => deleteEntry(id),
        onCancel: () => {}
    })) return;

};

async function deleteEntry(id) {
    try {
        await deleteDoc(
            doc(db, "users", currentUser.uid, "entries", id)
        );

        loadEntries(currentUser.uid);
        toggleFixedBottom();
        window.location.reload();

    } catch (error) {
        console.error(error);
    }
}

// =======================
// NAVIGATION
// =======================

document.getElementById("settings").onclick = async () => {
    showLoading("loadingOverlaySettings");
    openModal(0);
    let currentLanguage = getLanguage();
    languageSelect.value = currentLanguage;
    await loadUserSettings();
    hideLoading("loadingOverlaySettings");
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
    await loadExchangeRates();
}

saveSettingsBtn.onclick = async () => {
    showLoading("loadingOverlaySettings");

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
        customAlert(t("alerts.errorSavingSettings"), "Alert", "⚠️");
    }

    // CHANGE LANGUAGE IF NEEDED

    if (languageSelect.value !== getLanguage()) {
        await setLanguage(languageSelect.value);

        translatePage();

        const user = auth.currentUser;

        if (user) {

            await updateDoc(
                doc(db, "users", user.uid),
                {
                    language: languageSelect.value
                }
            );
        }
    }



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

        // IF CURRENCY CHANGED, ASK TO RELOAD FOR CORRECT DISPLAY
        if (currencyFromUserGlobal !== settingsCurrency.value) {
            await exchangeAll(currencyFromUserGlobal, settingsCurrency.value);
        } else {
            setTimeout(() => {
                loadEntries(currentUser.uid);
                toggleFixedBottom();
                closeModal();
                window.location.reload();
            }, 100);
        }
    } catch (error) {

        console.error(error);
        customAlert(t("alerts.errorUpdatingSettings"), "Alert", "⚠️");
    }


    hideLoading("loadingOverlaySettings");
};

goToOnboardingBtn.onclick = () => {

    window.location.href =
        "/HTML/onboarding.html";
};

// =======================
// EXCHANGE RATES
// ======================

import { exchangeRates, loadExchangeRates, convertCurrency, supportedCurrencies } from "./exchange.js";

const USD = document.getElementById("USD")
const MXN = document.getElementById("MXN")
const JPY = document.getElementById("JPY")
const KRW = document.getElementById("KRW")
const CAD = document.getElementById("CAD")
const CNY = document.getElementById("CNY")
const EUR = document.getElementById("EUR")
const GBP = document.getElementById("GBP")
const AUD = document.getElementById("AUD")
const CHF = document.getElementById("CHF")
const SEK = document.getElementById("SEK")
const NZD = document.getElementById("NZD")

let currencyButtons = [USD, MXN, JPY, KRW, CAD, CNY, EUR, GBP, AUD, CHF, SEK, NZD];

settingsCurrency.onchange = () => {

    const prevCurrency = currencyFromUserGlobal;
    const newCurrency = settingsCurrency.value;

    customConfirm({

        message: t("alerts.currencyChange", {
            prevCurrency,
            newCurrency,
            rateForward: (
                exchangeRates[newCurrency] /
                exchangeRates[prevCurrency]
            ).toFixed(4),

            rateBackward: (
                exchangeRates[prevCurrency] /
                exchangeRates[newCurrency]
            ).toFixed(4)
        }),

        onConfirm: () => {

        },

        onCancel: () => {

            currencyButtons.forEach(btn => {

                if (btn.value === prevCurrency) {

                    settingsCurrency.value =
                        prevCurrency;
                }
            });
        }
    });
};

async function openExchangeTable() {
    showLoading("loadingOverlayExchange");
    openModal(5);
    await loadExchangeTable();
    hideLoading("loadingOverlayExchange");
};

window.openExchangeTable = openExchangeTable;

async function loadExchangeTable() {

    await loadExchangeRates();

    exchangeTable.innerHTML = "";

    const baseCurrency =
        currencyFromUserGlobal;

    // ===== FIND BASE INFO =====
    const baseInfo =
        supportedCurrencies.find(
            c => c.code === baseCurrency
        );

    // ===== TITLE =====
    const title =
        document.createElement("p");

        title.className = "exchange-base-card";

    title.innerHTML =
        `
            <strong>
                ${t("labels.baseCurrency")}:
            </strong>

            ${baseInfo.flag}
            ${baseInfo.code}
            - ${getCurrencyName(baseInfo.code)}
        `;

    exchangeTable.appendChild(title);

    // ===== TABLE =====
    const table =
        document.createElement("table");

    table.className = "exchange-table";

    table.innerHTML = `
    
        <thead>

            <tr>
                <th>${t("labels.currency")}</th>
                <th>${t("labels.exchangeRate")}</th>
            </tr>

        </thead>

        <tbody></tbody>
    `;

    const tbody =
        table.querySelector("tbody");

    // ===== ONLY SUPPORTED CURRENCIES =====
    supportedCurrencies.forEach(currencyData => {

        const currency =
            currencyData.code;

        // Skip same currency
        if (currency === baseCurrency) return;

        // Skip if API missing
        if (!exchangeRates[currency]) return;

        // ===== CONVERSION =====
        const rate =
            (
                exchangeRates[currency] /
                exchangeRates[baseCurrency]
            ).toFixed(4);

        // ===== ROW =====
        const row =
            document.createElement("tr");

        row.innerHTML = `
        
            <td>

                <div class="currency-info">

                    <span class="currency-flag">
                        ${currencyData.flag}
                    </span>

                    <div>

                        <strong>
                            ${currencyData.code}
                        </strong>

                        <br>

                        <small>
                            ${getCurrencyName(currencyData.code)}
                        </small>

                    </div>

                </div>

            </td>

            <td>

                1 ${baseCurrency}
                =
                ${rate} ${currency}

            </td>
        `;

        tbody.appendChild(row);
    });

    const note = document.createElement("p");
    note.style.marginTop = "12px";
    note.style.fontSize = "12px";
    note.style.color = "gray";
    note.className = "exchange-note";
    note.textContent = t("timeline.currencyExchangeProvidedBy");
    

    exchangeTable.appendChild(note);
    exchangeTable.appendChild(table);
}



async function exchangeAll(prevCurrency, newCurrency) {

    if (!currentUser) return;

    try {



        const entriesRef = collection(
            db,
            "users",
            currentUser.uid,
            "entries"
        );

        const snapshot = await getDocs(entriesRef);

        for (const entryDoc of snapshot.docs) {

            const data = entryDoc.data();

            // =======================
            // ITEMS
            // =======================

            const convertedItems = (data.items || []).map(item => {

                const plus =
                    convertCurrency(
                        Number(item.plus || 0),
                        prevCurrency,
                        newCurrency
                    );

                const minus =
                    convertCurrency(
                        Number(item.minus || 0),
                        prevCurrency,
                        newCurrency
                    );

                return {

                    ...item,

                    plus: isNaN(plus) ? 0 : plus,

                    minus: isNaN(minus) ? 0 : minus
                };
            });

            // =======================
            // TOTAL
            // =======================

            const convertedTotal =
                convertCurrency(
                    Number(data.total || 0),
                    prevCurrency,
                    newCurrency
                );

            // =======================
            // TAG TOTALS
            // =======================

            const convertedTagTotals = {};

            if (data.tagTotals) {

                for (const tag in data.tagTotals) {

                    convertedTagTotals[tag] =
                        convertCurrency(
                            Number(data.tagTotals[tag] || 0),
                            prevCurrency,
                            newCurrency
                        );
                }
            }

            // =======================
            // SUBTAG TOTALS
            // =======================

            const convertedSubtagTotals = {};

            if (data.subtagTotals) {

                for (const tag in data.subtagTotals) {

                    convertedSubtagTotals[tag] = {};

                    for (const subtag in data.subtagTotals[tag]) {

                        convertedSubtagTotals[tag][subtag] =
                            convertCurrency(
                                Number(data.subtagTotals[tag][subtag] || 0),
                                prevCurrency,
                                newCurrency
                            );
                    }
                }
            }

            // =======================
            // UPDATE ENTRY
            // =======================

            await updateDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid,
                    "entries",
                    entryDoc.id
                ),
                {
                    items: convertedItems,
                    total: convertedTotal,
                    tagTotals: convertedTagTotals,
                    subtagTotals: convertedSubtagTotals
                }
            );

        }

        // =======================
        // UPDATE USER CURRENCY
        // =======================

        await updateDoc(
            doc(db, "users", currentUser.uid),
            {
                currency: newCurrency
            }
        );

        location.reload();

    } catch (error) {

        console.error(
            "exchangeAll ERROR:",
            error.message,
            error
        );
    }


    setTimeout(() => {
        loadEntries(currentUser.uid);
        toggleFixedBottom();
        closeModal();
        window.location.reload();
    }, 100);
}

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

        customAlert(t("alerts.tagUpdated"), "Success", "✅");

    } catch (error) {

        console.error(error);
    }
}

window.deleteTag = deleteTag;

async function deleteTag(tagId) {

    try {

        const confirmed =
            customConfirm({
                title: t("alerts.deleteCategory"),
                message: t("alerts.deleteCategoryMessage"),
                icon: "⚠️",
                confirmText: t("buttons.confirm"),
                cancelText: t("buttons.cancel"),
                danger: true,
                onConfirm: () => { deleteTagConfirmed(tagId); },
                onCancel: () => {}
            });
    } catch (error) {

        console.error(error);
    }

}

async function deleteTagConfirmed(tagId) {
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
}

addTagBtn.onclick = () => {

    tagsData.unshift({
        id: crypto.randomUUID(),
        name: t("labels.newTag"),
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
        customConfirm({
            title: t("alerts.deleteCategory"),
            message: t("alerts.deleteCategoryMessage"),
            icon: "⚠️",
            confirmText: t("buttons.confirm"),
            cancelText: t("buttons.cancel"),
            danger: true,
            onConfirm: () => { removeTag(index); },
            onCancel: () => {}
        });
};

async function removeTag(index) {
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
}

window.addSubtag = (index) => {

    tagsData[index].subtags.push({
        id: crypto.randomUUID(),
        name: t("labels.newSubtag")
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

    // VALIDATE COLOR
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
                value="${translateStoredLabel(tag.name)}"
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
                            value="${translateStoredLabel(sub.name)}"
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
                    ${t("buttons.addSubcategory")}
                </button>

            </div>

            <!-- ACTIONS -->
            <div class="tag-actions">

                <button
                    class="delete-btn"
                    onclick="removeTag(${index})"
                >
                    ${t("buttons.delete")}
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
        customConfirm({
            title: t("alerts.deleteAccount"),
            message: t("alerts.deleteAccountMessage"),
            icon: "⚠️",
            confirmText: t("buttons.confirm"),
            cancelText: t("buttons.cancel"),
            danger: true,
            onConfirm: () => {
                deleteAccount();
            },
            onCancel: () => {}
        });
};

async function deleteAccount() {
    try {
        // DELETE USER DOC
        await deleteDoc(
            doc(db, "users", currentUser.uid)
        );
        // DELETE AUTH ACCOUNT
        await auth.currentUser.delete();
        customAlert(t("alerts.accountDeleted"), "Success", "✅");
        window.location.href = "/index.html";
    } catch (error) {
        console.error(error);
        customAlert(t("alerts.errorDeletingAccount"), "Alert", "⚠️");
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
            : t("timeline.balanceHidden", {
                symbol: getCurrencySymbol(currencyFromUserGlobal),
                currency: currencyFromUserGlobal
            });

    showTotalBtn.textContent =
        totalVisible
            ? t("buttons.hideTotal")
            : `${t("buttons.showTotal")} 👁`;
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
        ? `${t("buttons.smartToolsClose")}`
        : `${t("buttons.smartTools")}`;
};

document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
        menu.classList.remove("active");
        toggleBtn.textContent = `${t("buttons.smartTools")}`;
    }
});

// =======================
// DARK MODE TOGGLE
// =======================
const darkModeToggle =
    document.getElementById("darkModeToggle");

// =======================
// APPLY SAVED MODE IMMEDIATELY
// =======================

const darkMode =
    localStorage.getItem("darkMode") === "true";

if (darkMode) {

    document.body.classList.add("dark-mode");

}

// =======================
// UPDATE BUTTON TEXT
// =======================

function updateDarkModeButton() {

    const isDarkMode =
        document.body.classList.contains("dark-mode");

    darkModeToggle.textContent =
        isDarkMode
            ? `${t("common.lightMode")}`
            : `${t("common.darkMode")}`;
}

// INITIAL BUTTON STATE
updateDarkModeButton();

// =======================
// TOGGLE
// =======================

darkModeToggle.onclick = () => {

    document.body.classList.toggle("dark-mode");

    const isDarkMode =
        document.body.classList.contains("dark-mode");

    localStorage.setItem(
        "darkMode",
        isDarkMode
    );

    updateDarkModeButton();
};




// Execute on load
window.addEventListener("load", toggleFixedBottom);
// Execute on resize
window.addEventListener("resize", toggleFixedBottom);
// Execute on scroll
window.addEventListener("scroll", toggleFixedBottom);






// =======================
// SMART TOOLS CODE
// =======================

import {
    predictFuture,
    cleanRender
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
            orderBy("date", "asc")
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

let currentSection = null;

function openModal(section) {
    currentSection = section;
    if (section == 0) {
        modalContentSettings.classList.remove("hidden");
        modalSettings.classList.remove("hidden");
    } else
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
        } else if (section == 5) {
            modalContentExchange.classList.remove("hidden");
            modalExchange.classList.remove("hidden");
        }
}

function closeModal() {
    if (currentSection === null) return;

    if (currentSection == 0) {
        modalSettings.classList.add("hidden");
    } else if (currentSection == 1) {
        modalFuture.classList.add("hidden");
        cleanRender();
    } else if (currentSection == 2) {
        modalSearch.classList.add("hidden");
    } else if (currentSection == 3) {
        modalSpending.classList.add("hidden");
    } else if (currentSection == 4) {
        modalComparison.classList.add("hidden");
    } else if (currentSection == 5) {
        modalExchange.classList.add("hidden");
    }

}

window.closeModal = closeModal;

// CLOSE TO CLICKING OUTSIDE
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
modalExchange.addEventListener("click", (e) => {
    if (e.target === modalExchange) closeModal();
});

// =======================
// SIMULATIONS
// =======================

// =======================
// VERIFICATION
// =======================
async function verificationForSimulation(uid, minEntries = 3) {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    const count = snap.data().entryCount || -1;

    if (count >= minEntries) return true;

    if (count === -1) {
        customAlert(t("alerts.userDataNotFound"), "Alert", "⚠️");
        return false;
    }

    customAlert(t("alerts.insufficientEntries", { count, minEntries }), "Alert", "⚠️");
    return false;
}

// =======================
// SIMULATE THE FUTURE
// =======================
async function openFuture() {
    showLoading("loadingOverlayFuture");
    openModal(1);
    const simulationOK = await verificationForSimulation(currentUser.uid, 5);
    if (!simulationOK) {
        closeModal();
    } else {
    }
    hideLoading("loadingOverlayFuture");
}

window.openFuture = openFuture;

document.getElementById("simulationDuration").onchange = (e) => {
    cleanRender();
}


// =======================
// SEARCH
// =======================
async function openSearch() {
    showLoading("loadingOverlaySearch");
    openModal(2);
    const simulationOK = await verificationForSimulation(currentUser.uid, 1);
    if (!simulationOK) {
        closeModal();
    } else {
        setupSearchInput();
        await loadTagFilters();
    }
    hideLoading("loadingOverlaySearch");
}

window.openSearch = openSearch;

// =======================
// Spending Insights
// =======================
async function openSpending() {
    showLoading("loadingOverlaySpending");
    openModal(3);
    const simulationOK = await verificationForSimulation(currentUser.uid, 3);
    if (!simulationOK) {
        closeModal();
    } else {
        await loadInsights();
    }
    hideLoading("loadingOverlaySpending");
}

window.openSpending = openSpending;

// =======================
// Insights Comparison
// =======================
async function openComparison() {
    showLoading("loadingOverlayComparison");
    openModal(4);
    const simulationOK = await verificationForSimulation(currentUser.uid, 3);
    if (!simulationOK) {
        closeModal();
    } else {
        await loadComparison();
    }
    hideLoading("loadingOverlayComparison");
}

window.openComparison = openComparison;

