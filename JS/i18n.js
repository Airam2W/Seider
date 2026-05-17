const STORAGE_KEY = "seider.language";
const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = ["en", "es", "ja", "ko"];

const bundles = {};
let currentLanguage = DEFAULT_LANGUAGE;

function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
}

function getByPath(source, key) {
    return key.split(".").reduce((value, segment) => {
        if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
            return value[segment];
        }

        return undefined;
    }, source);
}

function interpolate(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return values[key];
        }

        return `{${key}}`;
    });
}

async function loadBundle(language) {
    const normalized = normalizeLanguage(language);

    if (bundles[normalized]) {
        return bundles[normalized];
    }

    const response = await fetch(new URL(`../languages/${normalized}.json`, import.meta.url));
    bundles[normalized] = await response.json();
    return bundles[normalized];
}

function getStoredLanguage() {
    return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
}

function setStoredLanguage(language) {
    localStorage.setItem(STORAGE_KEY, normalizeLanguage(language));
}

function applyDocumentLanguage() {
    document.documentElement.lang = currentLanguage;
}

export async function initI18n(language = null) {
    await loadBundle(DEFAULT_LANGUAGE);

    const preferred = normalizeLanguage(language || getStoredLanguage());
    currentLanguage = preferred;

    if (preferred !== DEFAULT_LANGUAGE) {
        await loadBundle(preferred);
    }

    applyDocumentLanguage();
    return currentLanguage;
}

export async function setLanguage(language, options = {}) {
    const normalized = normalizeLanguage(language);
    const { persist = true, translate = true } = options;

    await loadBundle(DEFAULT_LANGUAGE);

    if (normalized !== DEFAULT_LANGUAGE) {
        await loadBundle(normalized);
    }

    currentLanguage = normalized;

    if (persist) {
        setStoredLanguage(normalized);
    }

    applyDocumentLanguage();

    if (translate) {
        translatePage();
    }

    return currentLanguage;
}

export function getLanguage() {
    return currentLanguage;
}

export function getStoredLanguageValue() {
    return getStoredLanguage();
}

export function setStoredLanguageValue(language) {
    setStoredLanguage(language);
}

export function t(key, values = {}) {
    const bundle = bundles[currentLanguage] || bundles[DEFAULT_LANGUAGE] || {};
    const fallback = bundles[DEFAULT_LANGUAGE] || {};
    const raw = getByPath(bundle, key) ?? getByPath(fallback, key);

    if (raw === undefined || raw === null) {
        return key;
    }

    if (typeof raw !== "string") {
        return raw;
    }

    return interpolate(raw, values);
}

const labelMap = {
    Electricity: "categories.electricity",
    Water: "categories.water",
    Food: "categories.food",
    Transport: "categories.transport",
    Entertainment: "categories.entertainment",
    Rent: "categories.rent",
    Groceries: "subcategories.groceries",
    Restaurant: "subcategories.restaurant",
    Bus: "subcategories.bus",
    Car: "subcategories.car",
    Taxi: "subcategories.taxi",
    Movies: "subcategories.movies",
    Games: "subcategories.games",
    House: "subcategories.house",
    Apartment: "subcategories.apartment",
    Bill: "subcategories.bill",
    Male: "common.male",
    Female: "common.female",
    Other: "common.other",
    Weekly: "common.weekly",
    Biweekly: "common.biweekly",
    Monthly: "common.monthly",
    "Save Money": "common.saveMoney",
    "Track Expenses": "common.trackExpenses",
    "Reduce Debt": "common.reduceDebt",
    "Improve Habits": "common.improveHabits"
};

export function translateStoredLabel(value) {
    const key = labelMap[value];
    return key ? t(key) : value;
}

export function getCurrencyName(currencyCode) {
    return t(`currencies.${currencyCode}`);
}

export function translatePage(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
        element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });

    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
        element.setAttribute("title", t(element.dataset.i18nTitle));
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
        element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
}

export function formatMoney(amount, currencyCode, { sign = true } = {}) {
    const numericAmount = Number(amount || 0);
    const signPrefix = sign && numericAmount >= 0 ? "+ " : numericAmount < 0 ? "- " : "";

    return `${signPrefix}${Math.abs(numericAmount)} ${currencyCode}`;
}

export function getDefaultLanguageForUser(userData = null) {
    return normalizeLanguage(userData?.language || getStoredLanguage());
}

export async function syncLanguageFromUser(userData = null) {
    return setLanguage(getDefaultLanguageForUser(userData), { persist: true, translate: true });
}

export { DEFAULT_LANGUAGE, STORAGE_KEY };