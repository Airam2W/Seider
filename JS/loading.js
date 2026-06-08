/* =========================================
   SHOW/HIDE
========================================= */

export function showLoading(showClass = "loadingOverlay"){

    document
        .getElementById(showClass)
        .classList.remove("hidden");
}

export function hideLoading(hideClass = "loadingOverlay"){

    document
        .getElementById(hideClass)
        .classList.add("hidden");
}