/* =========================================
   ELEMENTS
========================================= */

const customModalOverlay =
    document.getElementById("customModalOverlay");

const customModalTitle =
    document.getElementById("customModalTitle");

const customModalMessage =
    document.getElementById("customModalMessage");

const customModalConfirm =
    document.getElementById("customModalConfirm");

const customModalCancel =
    document.getElementById("customModalCancel");

const customModalIcon =
    document.getElementById("customModalIcon");

/* =========================================
   OPEN / CLOSE
========================================= */

export function openCustomModal() {

    customModalOverlay.classList.add("active");
}

export function closeCustomModal() {

    customModalOverlay.classList.remove("active");
}

/* =========================================
   ALERT
========================================= */

export function customAlert(
    message,
    title = "Alert",
    icon = "⚡"
){

    customModalTitle.textContent =
        title;

    customModalMessage.textContent =
        message;

    customModalIcon.textContent =
        icon;

    customModalCancel.style.display =
        "none";

    customModalConfirm.textContent =
        "OK";

    customModalConfirm.className =
        "custom-modal-btn confirm";

    openCustomModal();

    customModalConfirm.onclick = () => {

        closeCustomModal();
    };
}

/* =========================================
   CONFIRM
========================================= */

export function customConfirm({
    title = "Confirm",
    message = "Are you sure?",
    icon = "⚠️",
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
    onConfirm = () => {},
    onCancel = () => {}
}){

    customModalTitle.textContent =
        title;

    customModalMessage.innerHTML =
    message.replace(/\n/g, "<br>");


    customModalIcon.textContent =
        icon;

    customModalCancel.style.display =
        "block";

    customModalConfirm.textContent =
        confirmText;

    customModalCancel.textContent =
        cancelText;

    customModalConfirm.className =
        danger
            ? "custom-modal-btn danger"
            : "custom-modal-btn confirm";

    openCustomModal();

    customModalConfirm.onclick = () => {

        closeCustomModal();

        onConfirm();
    };

    customModalCancel.onclick = () => {

        closeCustomModal();

        onCancel();
    };
}

/* =========================================
   CLOSE OUTSIDE
========================================= */

customModalOverlay.addEventListener(
    "click",
    (e) => {

        if(e.target === customModalOverlay){

            closeCustomModal();
        }
    }
);