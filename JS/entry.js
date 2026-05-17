import { auth, app } from "./firebase-config.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { encryptData, decryptData } from "./encryption.js";

import { getCurrencySymbol } from "./utils.js";

import { currencies } from "./exchange.js";


const urlParams = new URLSearchParams(window.location.search);
const entryId = urlParams.get("id");
let isEdit = false;

const entryDateValue = document.getElementById("entryDateValue");

const db = getFirestore(app);

const itemsContainer = document.getElementById("itemsContainer");
const totalAmount = document.getElementById("totalAmount");
const notesInput = document.getElementById("notes");

let currentUser = null;
let currentSubtagContext = null;
let tags = [];
let subtagsMap = {};

let currencyFromUserGlobal = "...";

import { exchangeRates, loadExchangeRates } from "./exchange.js";


// =======================
// AUTH
// =======================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    await loadTags(user.uid);
    await loadExchangeRates();

    if (entryId) {
        isEdit = true;
        await loadEntry(entryId);
    } else {
        if (!entryId) {
            const now = new Date();
            entryDateValue.textContent = now.toLocaleString();
        }
        addItem();
    }
});

// =======================
// LOAD TAGS
// =======================
async function loadTags(uid) {
    const snapshot = await getDocs(
        collection(db, "users", uid, "tags")
    );

    tags = [];
    subtagsMap = {};

    for (const docSnap of snapshot.docs) {
        const tagData = docSnap.data();
        tags.push(tagData);

        // load subtags
        const subSnap = await getDocs(
            collection(db, "users", uid, "tags", docSnap.id, "subtags")
        );

        subtagsMap[tagData.name] = [];
        subSnap.forEach(sub => {
            subtagsMap[tagData.name].push(sub.data().name);
        });
    }

    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.currency) {
            currencyFromUserGlobal = userData.currency;
        }
    }

    updateTotal();
    
}


// =======================
// ADD ITEM ROW
// =======================
function addItem() {
    createTagGroup();
}


// =======================
// CALCULATE TOTAL
// =======================
function updateTotal() {
    let totalGlobal = 0;

    const groups = document.querySelectorAll(".tag-group");

    for (const group of groups) {
        let totalTag = 0;

        const subGroups = group.querySelectorAll(".subtag-Group");

        for (const sub of subGroups) {
            let totalSub = 0;

            const rows = sub.querySelectorAll(".item-row");

            for (const row of rows) {
                const inputs = row.querySelectorAll("input");

                if (inputs.length < 2) continue;

                const plus = Math.abs(Number(row.querySelector(".green").value || 0));
                const minus = Math.abs(Number(row.querySelector(".red").value || 0));

                const result = plus - minus;

                totalSub += result;
            };

            // SET SUBTAG TOTAL
            const subTotalSpan = sub.querySelector(".subtag-total");
            
            if (subTotalSpan) subTotalSpan.textContent = `${getCurrencySymbol(currencyFromUserGlobal)} ${totalSub} ${currencyFromUserGlobal}`;

            totalTag += totalSub;
        };

        // SET TAG TOTAL
        const tagTotalSpan = group.querySelector(".tag-total");
        if (tagTotalSpan) tagTotalSpan.textContent = `${getCurrencySymbol(currencyFromUserGlobal)} ${totalTag} ${currencyFromUserGlobal}`;

        totalGlobal += totalTag;
    };

    // GLOBAL TOTAL
    totalAmount.textContent = `Total: ${getCurrencySymbol(currencyFromUserGlobal)} ${totalGlobal} ${currencyFromUserGlobal}`;
}


// =======================
// SAVE ENTRY
// =======================
document.getElementById("btnSave").onclick = async () => {

    if (!currentUser) return;

    const items = [];
    const tagTotals = {};
    const subtagTotals = {};
    const groups = document.querySelectorAll(".tag-group");

    for (const group of groups) {
        const tag = group.querySelector("select").value;

        if (!tagTotals[tag]) tagTotals[tag] = 0;
        if (!subtagTotals[tag]) subtagTotals[tag] = {};

        const subGroups = group.querySelectorAll(".subtag-Group");

        for (const sub of subGroups) {
            const subtag = sub.querySelector("select").value;

            if (!subtagTotals[tag][subtag]) {
                subtagTotals[tag][subtag] = 0;
            }

            const rows = sub.querySelectorAll(".item-row");

            for (const row of rows) {
                const inputs = row.querySelectorAll("input");

                const receipt = row.dataset.receipt || null;

                if (inputs.length < 2) continue;

                const plus = Math.abs(Number(row.querySelector(".green").value || 0));
                const minus = Math.abs(Number(row.querySelector(".red").value || 0));

                if (plus === 0 && minus === 0) continue;

                const result = plus - minus;

                let receiptData = null;

                if (row.dataset.receipt) {
                    receiptData = {
                        url: row.dataset.receipt,
                        name: row.dataset.receiptName,
                        type: row.dataset.receiptType
                    };
                }

                // SAVE ITEM
                items.push({
                    tag,
                    subtag,
                    plus,
                    minus,
                    receipt: receiptData
                });

                // ACUMULATE TOTALS
                subtagTotals[tag][subtag] += result;
                tagTotals[tag] += result;

            };
        };
    };

    const totalText = totalAmount.textContent.replace(`Total: ${getCurrencySymbol(currencyFromUserGlobal)} `, "").trim();
    const numberTotal = totalText.split(" ")[0].replace(/,/g, "");
    const total = Number(numberTotal) || 0;


    const html = quill.root.innerHTML;
    const cleanHTML = DOMPurify.sanitize(html);

    try {
        if (isEdit) {
            await updateDoc(
                doc(db, "users", currentUser.uid, "entries", entryId),
                {
                    items,
                    notes: encryptData(cleanHTML),
                    tagTotals,
                    subtagTotals,
                    total
                }
            );
        } else {
            await addDoc(
                collection(db, "users", currentUser.uid, "entries"),
                {
                    date: new Date(),
                    items,
                    notes: encryptData(cleanHTML),
                    tagTotals,
                    subtagTotals,
                    total
                }
            );
        }

        window.location.href = "timeline.html";

    } catch (error) {
        console.error(error);
    }
};

document.getElementById("btnAddGroup").onclick = () => {
    createTagGroup();
};

// =======================
// LOAD ENTRY FOR EDIT
// =======================
async function loadEntry(id) {
    const docRef = doc(db, "users", currentUser.uid, "entries", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    itemsContainer.innerHTML = "";

    const grouped = {};

    data.items.forEach(item => {
        if (!grouped[item.tag]) grouped[item.tag] = {};

        if (!grouped[item.tag][item.subtag]) {
            grouped[item.tag][item.subtag] = [];
        }

        grouped[item.tag][item.subtag].push(item);
    });

    if (data.date) {
        const dateObj = data.date.toDate();
        entryDateValue.textContent = dateObj.toLocaleString();
    }

    Object.keys(grouped).forEach(tagName => {
        createTagGroup(tagName);

        const group = itemsContainer.lastChild;
        const select = group.querySelector("select");
        const container = group.querySelector(".subtags-container");

        Object.keys(grouped[tagName]).forEach(subtagName => {
            createSubtagGroup(
                select,
                container,
                subtagName,
                grouped[tagName][subtagName]
            );
        });
    });

    quill.root.innerHTML = decryptData(data.notes) || "";
    updateTotal();
}





// =======================
// UI ENTRY CREATION
// =======================
function createUIEntry(item = null, tagSelect = null, container = null) {
    const div = document.createElement("div");
    div.className = "item-row";

    // ===== INPUTS =====
    const inputPlus = document.createElement("input");
    inputPlus.type = "number";
    inputPlus.placeholder = "+";
    inputPlus.className = "green";
    inputPlus.value = item ? item.plus || "" : "";

    const inputMinus = document.createElement("input");
    inputMinus.type = "number";
    inputMinus.placeholder = "-";
    inputMinus.className = "red";
    inputMinus.value = item ? item.minus || "" : "";

    // ===== CONVERTER INPUT =====
    const convertInput = document.createElement("input");
    convertInput.type = "number";
    convertInput.placeholder = "Foreign Amount";

    // ===== CURRENCY SELECT =====
    const currencySelect = document.createElement("select");

    // DELETE OF LIST OF OPTIONS USER CURRENT CURRENCY TO AVOID DUPLICATE
    const currencyIndex = currencies.indexOf(currencyFromUserGlobal);
    if (currencyIndex !== -1) {
        currencies.splice(currencyIndex, 1);
    }

    // TITLE OF FOREIGN CURRENCY
    const titleOption = document.createElement("h4");
    titleOption.textContent = "Convert to "+currencyFromUserGlobal+" from:";
    titleOption.style.marginRight = "10px";
    
    

    currencies.forEach(currency => {
        const option = document.createElement("option");
        option.value = currency;
        option.textContent = currency;
        currencySelect.appendChild(option);
    });

    // ===== CONVERT BUTTON =====
    const btnConvertPlus = document.createElement("button");
    btnConvertPlus.textContent = "Put in +";
    btnConvertPlus.onclick = () => convertPlus(convertInput, inputPlus, convertInput.value, currencySelect.value);

    const btnConvertMinus = document.createElement("button");
    btnConvertMinus.textContent = "Put in -";
    btnConvertMinus.onclick = () => convertMinus(convertInput, inputMinus, convertInput.value, currencySelect.value);

    // ===== FILE INPUT (HIDDEN) =====
    const inputFile = document.createElement("input");
    inputFile.type = "file";
    inputFile.accept = "image/*,application/pdf";
    inputFile.style.display = "none";

    // ===== BUTTON SELECT FILE =====
    const btnUpload = document.createElement("button");
    btnUpload.textContent = "Upload picture/PDF";
    btnUpload.onclick = () => inputFile.click();

    // ===== FILE NAME =====
    const fileName = document.createElement("span");
    fileName.className = "file-name";
    fileName.textContent = "No file";

    // ===== PREVIEW =====
    const preview = document.createElement("div");
    preview.className = "preview";

    // ===== DOWNLOAD BUTTON =====
    const btnDownload = document.createElement("button");
    btnDownload.textContent = "Download";
    btnDownload.style.display = "none";

    btnDownload.onclick = () => {
        const url = div.dataset.receipt;
        const name = div.dataset.receiptName || "file";

        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
    };

    // ===== DELETE =====
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "✕";
    btnDelete.onclick = () => {
        const parent = div.parentElement;
        div.remove();

        if (parent.children.length === 0) {
            parent.parentElement.remove();
        }

        updateTotal();
    };

    // ===== LOAD FILE =====
    inputFile.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const base64 = await compressAndConvertToBase64(file);

        // Save in dataset for later upload when saving entry
        div.dataset.receipt = base64;
        div.dataset.receiptName = file.name;
        div.dataset.receiptType = file.type;

        fileName.textContent = file.name;
        btnDownload.style.display = "inline";

        // Clear previous preview
        preview.innerHTML = "";

        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = base64;
            img.style.width = "80px";
            preview.appendChild(img);
        } else {
            const icon = document.createElement("span");
            icon.textContent = "📄 PDF";
            preview.appendChild(icon);
        }
    };

    // ===== LOAD EXISTING ITEM =====
    if (item && item.receipt) {
        div.dataset.receipt = item.receipt.url;
        div.dataset.receiptName = item.receipt.name;
        div.dataset.receiptType = item.receipt.type;

        fileName.textContent = item.receipt.name;
        btnDownload.style.display = "inline";

        if (item.receipt.type?.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = item.receipt.url;
            img.style.width = "80px";
            preview.appendChild(img);
        } else {
            preview.textContent = "📄 PDF";
        }
    }

    // ===== EVENTS =====
    inputPlus.oninput = updateTotal;
    inputMinus.oninput = updateTotal;

    // ===== APPEND =====
    div.appendChild(inputPlus);
    div.appendChild(inputMinus);

    div.appendChild(btnUpload);
    div.appendChild(inputFile);

    div.appendChild(fileName);
    div.appendChild(preview);
    div.appendChild(btnDownload);

    div.appendChild(titleOption);

    div.appendChild(convertInput);
    div.appendChild(currencySelect);

    div.appendChild(btnConvertPlus);
    div.appendChild(btnConvertMinus);

    div.appendChild(btnDelete);

    container.appendChild(div);
}

// =======================
// CONVERT
// =======================
function convertCurrency(amount, fromCurrency, toCurrency) {

    if (fromCurrency === toCurrency) {
        return amount;
    }

    // Change to USD first
    const amountInUSD = amount / exchangeRates[fromCurrency];

    // And then to target currency
    const converted =
        amountInUSD * exchangeRates[toCurrency];

    return converted;
}

function convertPlus(convertInput, inputPlus, amount, fromCurrency) {

    if (!amount) return;

    const converted =
        convertCurrency(
            amount,
            fromCurrency,
            currencyFromUserGlobal
        );

    inputPlus.value =
        converted.toFixed(2);

    updateTotal();

    convertInput.value = "";
};

function convertMinus(convertInput, inputMinus, amount, fromCurrency) {

    if (!amount) return;

    const converted =
        convertCurrency(
            amount,
            fromCurrency,
            currencyFromUserGlobal
        );

    inputMinus.value =
        converted.toFixed(2);

    updateTotal();
    convertInput.value = "";
};

// =======================
// TAG
// =======================
document.getElementById("btnCreateTag").onclick = async () => {
  const tagName = document.getElementById("newTagName").value.trim();
  if (!tagName || !currentUser) return;

  try {
    await addDoc(collection(db, "users", currentUser.uid, "tags"), { name: tagName });

    await loadTags(currentUser.uid);

    // Refresh all selects with the new tag and select it
    refreshAllSelects(tagName);

    // Close modal and reset input
    document.getElementById("newTagModal").classList.add("hidden");
    document.getElementById("newTagName").value = "";
  } catch (error) {
    console.error(error);
  }
};



document.getElementById("btnCancelTag").onclick = () => {
    document.getElementById("newTagModal").classList.add("hidden");
    document.getElementById("newTagName").value = "";

    const FirstTagDefault = "Electricity";
    refreshAllSelects(FirstTagDefault);
};

function refreshAllSelects(newTagName = null) {
  const selects = document.querySelectorAll(".tag-group .tag-header select");

  selects.forEach(select => {
    const currentValue = select.value;

    select.innerHTML = "";

    // Load tags again
    tags.forEach(tag => {
      const option = document.createElement("option");
      option.value = tag.name;
      option.textContent = tag.name;
      select.appendChild(option);
    });

    // + New Tag option
    const createOption = document.createElement("option");
    createOption.value = "create";
    createOption.textContent = "+ New Tag";
    select.appendChild(createOption);

    // Logic to determine which tag should be selected after refresh
    if (currentValue === "create" && newTagName) {
      // If user just created a new tag → select it
      select.value = newTagName;
    } else if (currentValue !== "create") {
      // If user was on an existing tag → keep it (even if it was deleted, to avoid forcing them to switch to another tag)
      select.value = currentValue;
    } else {
      // If user was on "create" option and didn't create a new tag → reset to default state (first tag or "+ New Tag" if no tags)
      select.value = "create";
    }
  });
}


function createTagGroup(selectedTag = null) {
    const group = document.createElement("div");
    group.className = "tag-group";

    const header = document.createElement("div");
    header.className = "tag-header";

    const select = document.createElement("select");

    tags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag.name;
        option.textContent = tag.name;

        if (tag.name === selectedTag) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    // + New Tag
    const createOption = document.createElement("option");
    createOption.value = "create";
    createOption.textContent = "+ New Tag";
    select.appendChild(createOption);

    select.onchange = () => {
        if (select.value === "create") {
            document.getElementById("newTagModal").classList.remove("hidden");
            return;
        }

        // Clean subtags container when changing tag
        subtagsContainer.innerHTML = "";

        // Create first subtag group by default when selecting a tag (if subtags exist)
        const firstSub = (subtagsMap[select.value] || [])[0];

        createSubtagGroup(select, subtagsContainer, firstSub);

    };

    // ===== DELETE Group =====
    const btnDeleteGroup = document.createElement("button");
    btnDeleteGroup.textContent = "Delete Group";
    btnDeleteGroup.onclick = () => {
        if (!confirm("Delete this Group?")) return;
        group.remove();
        updateTotal();
    };

    // ===== SUBTAGS CONTAINER =====
    const subtagsContainer = document.createElement("div");
    subtagsContainer.className = "subtags-container";

    // ===== ADD SUBTAG Group =====
    const btnAddSubtag = document.createElement("button");
    btnAddSubtag.textContent = "+ Add Item";
    btnAddSubtag.onclick = () => {
        createSubtagGroup(select, subtagsContainer);
    };

    // ===== TOTAL TAG =====
    const totalTag = document.createElement("span");
    totalTag.className = "tag-total";
    totalTag.textContent = getCurrencySymbol(currencyFromUserGlobal) + " 0 " + currencyFromUserGlobal;

    // ===== APPEND =====
    header.appendChild(select);
    header.appendChild(btnDeleteGroup);
    header.appendChild(totalTag);

    group.appendChild(header);
    group.appendChild(subtagsContainer);
    group.appendChild(btnAddSubtag);

    itemsContainer.appendChild(group);
}

function createSubtagGroup(tagSelect, container, subtagName = null, items = []) {
    const subGroup = document.createElement("div");
    subGroup.className = "subtag-Group";

    // ===== SELECT SUBTAG =====
    const subtagSelect = document.createElement("select");

    const tagName = tagSelect.value;
    const subs = subtagsMap[tagName] || [];

    subs.forEach(sub => {
        const option = document.createElement("option");
        option.value = sub;
        option.textContent = sub;

        if (sub === subtagName) option.selected = true;

        subtagSelect.appendChild(option);
    });

    // + New Subtag option
    const createOption = document.createElement("option");
    createOption.value = "create_subtag";
    createOption.textContent = "+ New Subtag";
    subtagSelect.appendChild(createOption);

    subtagSelect.onchange = () => {
        if (subtagSelect.value === "create_subtag") {
            openSubtagModal(tagSelect, subtagSelect);
        }
    };

    // ===== ITEMS CONTAINER =====
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "tag-items";

    // ===== ADD SUB ITEM =====
    const btnAddSub = document.createElement("button");
    btnAddSub.textContent = "+ Add SubItem";
    btnAddSub.onclick = () => createUIEntry(null, tagSelect, itemsDiv);

    // ===== DELETE SUBTAG =====
    const btnDeleteSub = document.createElement("button");
    btnDeleteSub.textContent = "✕";
    btnDeleteSub.onclick = () => {
        subGroup.remove();
        updateTotal();
    };

    // ===== TOTAL SUBTAG =====
    const totalSubtag = document.createElement("span");
    totalSubtag.className = "subtag-total";
    totalSubtag.textContent = getCurrencySymbol(currencyFromUserGlobal) + " 0 " + currencyFromUserGlobal;

    // ===== APPEND =====
    subGroup.appendChild(subtagSelect);
    subGroup.appendChild(btnDeleteSub);
    subGroup.appendChild(totalSubtag);
    subGroup.appendChild(itemsDiv);
    subGroup.appendChild(btnAddSub);

    container.appendChild(subGroup);

    // Load existing items if provided
    items.forEach(item => {
        createUIEntry(item, tagSelect, itemsDiv);
    });
}

document.getElementById("btnCreateSubtag").onclick = async () => {
    const name = document.getElementById("newSubtagName").value.trim();
    if (!name || !currentUser || !currentSubtagContext) return;

    try {
        const tagName = currentSubtagContext.tag;

        // Find the tag document to get its ID
        const tagDoc = tags.find(t => t.name === tagName);


        const tagSnapshot = await getDocs(
            collection(db, "users", currentUser.uid, "tags")
        );

        let tagId = null;

        tagSnapshot.forEach(docSnap => {
            if (docSnap.data().name === tagName) {
                tagId = docSnap.id;
            }
        });

        if (!tagId) return;

        // Save new subtag under the correct tag document
        await setDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "tags",
                tagId,
                "subtags",
                name.toLowerCase()
            ),
            { name },
            { merge: true }
        );

        // Reload tags and subtags to get the updated list
        await loadTags(currentUser.uid);

        // Refresh all subtag selects with the new subtag and select it
        refreshAllSubtagSelects(name);

        closeSubtagModal();

    } catch (error) {
        console.error(error);
    }
};

function closeSubtagModal() {
    document.getElementById("newSubtagModal").classList.add("hidden");
    document.getElementById("newSubtagName").value = "";
    currentSubtagContext = null;
}

document.getElementById("btnCancelSubtag").onclick = closeSubtagModal;

function refreshAllSubtagSelects(newSubtagName = null) {
    const selects = document.querySelectorAll(".subtag-Group select");

    selects.forEach(select => {
        const currentValue = select.value;
        const tagName = select.closest(".tag-group").querySelector("select").value;

        select.innerHTML = "";

        const subs = subtagsMap[tagName] || [];

        subs.forEach(sub => {
            const option = document.createElement("option");
            option.value = sub;
            option.textContent = sub;
            select.appendChild(option);
        });

        // + New Subtag
        const createOption = document.createElement("option");
        createOption.value = "create_subtag";
        createOption.textContent = "+ New Subtag";
        select.appendChild(createOption);

        if (currentValue === "create_subtag" && newSubtagName) {
            select.value = newSubtagName;
        } else {
            select.value = currentValue;
        }
    });
}

function openSubtagModal(tagSelect, subtagSelect) {
    currentSubtagContext = {
        tag: tagSelect.value,
        select: subtagSelect
    };

    document.getElementById("newSubtagModal").classList.remove("hidden");
}


// =======================
// STORAGE
// =======================
async function uploadReceipt(file, userId) {
    const filePath = `receipts/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);

    const url = await getDownloadURL(storageRef);

    return {
        url,
        name: file.name,
        type: file.type
    };
}

async function compressAndConvertToBase64(file) {
    if (file.type === "application/pdf") {
        return await fileToBase64(file); // No compression for PDFs, just convert to base64
    }

    const img = new Image();
    const reader = new FileReader();

    return new Promise((resolve) => {
        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement("canvas");

            const MAX_WIDTH = 400;
            const scale = MAX_WIDTH / img.width;

            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const base64 = canvas.toDataURL("image/jpeg", 0.5);
            resolve(base64);
        };

        reader.readAsDataURL(file);
    });
}

function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}


// =======================
// BUTTONS
// =======================
document.getElementById("btnAddGroup").onclick = () => {
    createTagGroup();
};

document.getElementById("btnCancel").onclick = () => {
    window.location.href = "timeline.html";
};

// =======================
// NOTES
// ======================
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Add any notes about this entry...',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['clean']
        ]
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
            ? "Light Mode"
            : "Dark Mode";
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