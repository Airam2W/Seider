export function getCurrencySymbol(currencyCode) {

    const symbols = {
        USD: "$",
        MXN: "$",
        JPY: "¥",
        KRW: "₩",
        CAD: "C$",
        CNY: "¥",
        EUR: "€",
        GBP: "£",
        AUD: "A$",
        CHF: "CHF",
        SEK: "kr",
        NZD: "NZ$"
    };

    return symbols[currencyCode] || currencyCode;
}