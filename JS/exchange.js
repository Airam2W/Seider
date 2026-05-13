export let exchangeRates = {};

export async function loadExchangeRates() {

    // ===== LOAD SAVED RATES FIRST =====
    const savedRates =
        localStorage.getItem("exchangeRates");

    if (savedRates) {

        exchangeRates =
            JSON.parse(savedRates);

        console.log(
            "Loaded exchange rates from localStorage:",
            exchangeRates
        );
    }

    // ===== UPDATE FROM API =====
    try {

        const response =
            await fetch(
                "https://open.er-api.com/v6/latest/USD"
            );

        const data =
            await response.json();

        if (data.result === "success") {

            exchangeRates =
                data.rates;

            // ===== SAVE TO LOCALSTORAGE =====
            localStorage.setItem(
                "exchangeRates",
                JSON.stringify(exchangeRates)
            );

            console.log(
                "Updated exchange rates from API:",
                exchangeRates
            );
        }

    } catch (error) {

        console.error(
            "Error loading exchange rates:",
            error
        );

    }
}

export function convertCurrency(
    amount,
    fromCurrency,
    toCurrency
) {

    if (
        !exchangeRates[fromCurrency] ||
        !exchangeRates[toCurrency]
    ) {

        console.error(
            "Currency not found:",
            fromCurrency,
            toCurrency
        );

        return amount;
    }

    // ===== CONVERT TO USD BASE =====
    const amountInUSD =
        amount / exchangeRates[fromCurrency];

    // ===== CONVERT TO TARGET =====
    const converted =
        amountInUSD * exchangeRates[toCurrency];

    console.log(
        `${amount} ${fromCurrency} -> ${converted} ${toCurrency}`
    );

    return Number(converted.toFixed(2));
}

export const currencies = [
        "USD",
        "AUD",
        "CAD",
        "CHF",
        "CNY",
        "EUR",
        "GBP",
        "JPY",
        "KRW",
        "MXN",
        "NZD",
        "SEK"
    ];


export const supportedCurrencies = [

    {
        code: "USD",
        name: "US Dollar",
        flag: getFlagEmoji("US")
    },

    {
        code: "MXN",
        name: "Mexican Peso",
        flag: getFlagEmoji("MX")
    },

    {
        code: "JPY",
        name: "Japanese Yen",
        flag: getFlagEmoji("JP")
    },

    {
        code: "KRW",
        name: "Korean Won",
        flag: getFlagEmoji("KR")
    },

    {
        code: "CAD",
        name: "Canadian Dollar",
        flag: getFlagEmoji("CA")
    },

    {
        code: "CNY",
        name: "Chinese Yuan",
        flag: getFlagEmoji("CN")
    },

    {
        code: "EUR",
        name: "Euro",
        flag: getFlagEmoji("EU")
    },

    {
        code: "GBP",
        name: "British Pound",
        flag: getFlagEmoji("GB")
    },

    {
        code: "AUD",
        name: "Australian Dollar",
        flag: getFlagEmoji("AU")
    },

    {
        code: "CHF",
        name: "Swiss Franc",
        flag: getFlagEmoji("CH")
    },

    {
        code: "SEK",
        name: "Swedish Krona",
        flag: getFlagEmoji("SE")
    },

    {
        code: "NZD",
        name: "New Zealand Dollar",
        flag: getFlagEmoji("NZ")
    }
];

function getFlagEmoji(countryCode) {
  const code = countryCode.toUpperCase();
  const OFFSET = 127397;
  console.log("Flag for", code, ":", String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + OFFSET)));
  return String.fromCodePoint(
    ...[...code].map(c => c.charCodeAt(0) + OFFSET)
  );
}