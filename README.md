<p align="center">
  <img src="IMG/largeLogo.png" alt="Seider logo" width="260">
</p>

<h1 align="center">Seider</h1>

<p align="center">
  A personal finance application for tracking, organizing, and understanding money with clarity, privacy, and structure.
</p>

<p align="center">
  <a href="https://airam2w.github.io/Seider/"><strong>Open Live Project</strong></a>
</p>

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-static_site-E34F26?style=for-the-badge&logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-responsive_ui-1572B6?style=for-the-badge&logo=css3&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES_modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-auth_and_firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=111">
</p>

---

## At a Glance

| Area | Description |
| --- | --- |
| Product | Personal finance workspace for income, expenses, categories, notes, receipts, and insights. |
| Experience | Account access, onboarding, timeline, entry management, smart tools, settings, dark mode, and multilingual support. |
| Smart Tools | Spending analytics, period comparison, advanced search, future simulation, and currency exchange. |
| Architecture | Static HTML/CSS/JavaScript application using Firebase Authentication and Firestore. |
| Languages | English, Spanish, Japanese, and Korean. |
| Status | Active development. |

---

## Table of Contents

| Product | Technical |
| --- | --- |
| [Product Vision](#product-vision) | [Technical Overview](#technical-overview) |
| [What Seider Does](#what-seider-does) | [Tech Stack](#tech-stack) |
| [Core Experience](#core-experience) | [Project Structure](#project-structure) |
| [Smart Tools](#smart-tools) | [Getting Started](#getting-started) |
| [Security and Privacy](#security-and-privacy) | [Configuration Notes](#configuration-notes) |
| [User Journey](#user-journey) | [Data Model](#data-model) |
|  | [Development Notes](#development-notes) |
|  | [Roadmap Ideas](#roadmap-ideas) |

---

## Product Vision

Seider is built around a simple idea: personal finance should feel understandable, organized, and accessible. Instead of only showing numbers, Seider helps users build a financial timeline, add context to each movement, and turn daily records into useful insight.

The application is intended for users who want to:

| User Need | How Seider Helps |
| --- | --- |
| Track income and expenses in one place. | Users can create detailed entries with positive and negative values. |
| Understand where their money is going. | Entries are organized by categories, subcategories, totals, and dates. |
| Keep financial context. | Notes and receipt data can be attached to entries. |
| Review behavior over time. | The timeline and analytics tools expose historical patterns. |
| Explore future possibilities. | Simulations are generated from past financial activity. |
| Use the product comfortably. | The interface supports multiple languages and dark mode. |

---

## What Seider Does

Seider works as a personal finance workspace. After signing in, users complete a short onboarding process where they choose their currency, set basic financial information, and define a goal. From there, they can start creating entries that represent daily, weekly, or occasional financial movements.

Each entry can include multiple grouped items. For example, a user can record groceries, transportation, rent, entertainment, income, bills, or any custom category they create. Seider calculates totals automatically and shows the user's financial activity in a chronological timeline.

Beyond recording transactions, Seider includes analytical tools that help users understand their financial behavior instead of only storing it.

---

## Core Experience

| Experience | What It Includes |
| --- | --- |
| Account Access | Email/password, Google, and GitHub authentication. |
| Onboarding | Preferred currency, profile details, current balance, income frequency, and financial goal. |
| Timeline | Chronological entries, expandable details, running totals, settings, tools, language, and theme controls. |
| Entry Management | Categories, subcategories, income, expenses, automatic totals, rich-text notes, receipts, and editing. |
| Personalization | Dark mode, English/Spanish/Japanese/Korean translations, supported currencies, custom tags, and editable settings. |

### Account Access

Users can create an account and sign in with:

- Email and password.
- Google.
- GitHub.

Authenticated users are redirected into their finance workspace. New users are guided through onboarding before reaching the main timeline.

### Onboarding

The onboarding flow collects the user's initial preferences and financial context:

- Preferred currency.
- Profile details such as gender and age range.
- Current balance.
- Income frequency.
- Main financial goal.

This gives Seider enough context to personalize totals, settings, and finance views.

### Timeline

The timeline is the main workspace. It displays financial entries in chronological order and shows the user's total balance based on their starting balance plus recorded entries.

From the timeline, users can:

- Review past entries.
- Expand entry details.
- Add new entries.
- Edit existing entries.
- Open smart tools.
- Manage settings.
- Change language and theme.

### Entry Management

Entries support detailed financial recording:

- Categories and subcategories.
- Positive values for income.
- Negative values for expenses.
- Automatic totals per subcategory, category, and entry.
- Rich-text notes.
- Optional receipt data.
- Editing existing entries.

Users can also create custom categories and subcategories to match their own financial habits.

### Personalization

Seider includes product-level personalization features:

- Dark mode.
- Four interface languages: English, Spanish, Japanese, and Korean.
- Multiple supported currencies.
- Custom tags and subtags.
- Editable account and finance settings.

---

## Smart Tools

Seider includes several tools designed to help users interpret their financial information.

| Tool | Purpose |
| --- | --- |
| Spending Analytics | Summarizes user activity and visualizes behavior by category and subcategory. |
| Period Comparison | Compares weeks, months, or years and highlights what changed. |
| Advanced Search | Finds entries by encrypted notes, selected categories, and selected subcategories. |
| Future Simulation | Generates possible future activity from historical patterns, category weights, and usage frequency. |
| Currency Exchange | Supports multiple currencies and caches the latest available rates locally. |

### Spending Analytics

The spending analytics tool summarizes user activity and visualizes financial behavior by category and subcategory. It can show totals, averages, best and worst days, strongest categories, and spending trends.

### Period Comparison

The comparison tool helps users compare financial behavior across weeks, months, or years. It highlights whether income or expenses increased or decreased and shows which categories contributed most to the change.

### Advanced Search

Users can search through entries using:

- Keywords from encrypted notes.
- Selected categories.
- Selected subcategories.

This makes it easier to locate specific records without manually scanning the full timeline.

### Future Simulation

The future simulation tool analyzes past entries and generates possible future financial activity based on historical patterns, category weights, and usage frequency. It is not financial advice, but it gives users a practical way to explore possible outcomes from their existing behavior.

### Currency Exchange

Seider supports multiple currencies and loads exchange rates from an external API. Rates are cached locally so the application can continue using the latest available data if the API is temporarily unavailable.

---

## Security and Privacy

Seider uses Firebase Authentication to manage user identity and Firestore to store user data. It also encrypts selected sensitive fields on the client using CryptoJS AES before saving them.

| Security Area | Implementation |
| --- | --- |
| Authentication | Firebase Authentication. |
| Cloud data | Firestore user documents and subcollections. |
| Sensitive fields | Client-side AES encryption with CryptoJS. |
| Local preferences | Language, dark mode, and cached exchange rates are stored in local storage. |

Encrypted examples include:

- Display names.
- Rich-text entry notes.

The encryption key is derived from the authenticated user's UID and email:

```js
user.uid + user.email
```

This helps avoid storing selected sensitive content as plain text in Firestore. However, this should not be treated as a complete production security model by itself. A production deployment should also include strict Firestore security rules, secure Firebase provider configuration, HTTPS hosting, authorized domains, and careful handling of receipt data.

Firebase web configuration values are public by design, but they must be paired with secure Firebase rules and correctly configured authentication domains.

---

## User Journey

| Step | Flow |
| --- | --- |
| 1 | A visitor opens Seider from the landing page. |
| 2 | The user signs up or logs in. |
| 3 | Seider creates a user profile if one does not already exist. |
| 4 | New users complete onboarding. |
| 5 | The user enters the timeline workspace. |
| 6 | The user records income and expenses through entries. |
| 7 | Seider organizes entries by date, category, subcategory, and totals. |
| 8 | The user explores analytics, search, comparison, simulation, currency tools, and settings. |

---

## Technical Overview

Seider is a static web application built with HTML, CSS, and vanilla JavaScript modules. It does not currently use a build tool, package manager, or front-end framework. Pages are served directly by the browser, while Firebase provides authentication and cloud persistence.

The codebase is organized around feature-specific JavaScript modules:

| Module | Responsibility |
| --- | --- |
| `home.js` | Controls the landing page, authentication entry points, language switching, and first redirects. |
| `onboarding.js` | Manages the onboarding flow and stores initial user finance preferences. |
| `timeline.js` | Powers the main finance dashboard, entries list, settings, tools, totals, and modal workflows. |
| `entry.js` | Handles entry creation, editing, item grouping, note editing, receipts, and totals. |
| `i18n.js` | Loads language bundles and applies translations. |
| `encryption.js` | Centralizes AES encryption and decryption helpers. |
| `exchange.js` | Loads, caches, and applies exchange rates. |
| `tools/*.js` | Contains the smart finance tools. |

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Front-end | HTML5, CSS3, vanilla JavaScript with ES modules. |
| Authentication | Firebase Authentication with email/password, Google, and GitHub. |
| Database | Firestore for user, entry, tag, and subtag data. |
| Encryption | CryptoJS 4.2.0 for AES encryption and decryption. |
| Charts | Chart.js. |
| Rich text | Quill 1.3.6. |
| Sanitization | DOMPurify 3.0.6. |
| External data | Exchange rates from `open.er-api.com`. |
| Styling assets | Google Fonts and custom CSS. |

---

## Project Structure

```text
Seider/
|-- index.html
|-- README.md
|-- CSS/
|   |-- styles.css
|   |-- home.css
|   |-- timeline.css
|   |-- entry.css
|   |-- onboarding.css
|   |-- settings.css
|   |-- exchange.css
|   `-- tools/
|       |-- comparison.css
|       |-- future.css
|       |-- search.css
|       `-- spending.css
|-- HTML/
|   |-- entry.html
|   |-- onboarding.html
|   `-- timeline.html
|-- IMG/
|   |-- logo.png
|   `-- largeLogo.png
|-- JS/
|   |-- auth-guard.js
|   |-- customModals.js
|   |-- encryption.js
|   |-- entry.js
|   |-- exchange.js
|   |-- firebase-config.js
|   |-- home.js
|   |-- i18n.js
|   |-- loading.js
|   |-- onboarding.js
|   |-- timeline.js
|   |-- utils.js
|   `-- tools/
|       |-- comparison.js
|       |-- future.js
|       |-- search.js
|       `-- spending.js
`-- languages/
    |-- en.json
    |-- es.json
    |-- ja.json
    `-- ko.json
```

---

## Getting Started

This project does not require a package manager or build step. It should be served through a local or hosted HTTP server because it uses ES modules, Firebase imports, and JSON language files.

```text
https://airam2w.github.io/Seider/
```

---

## Configuration Notes

| Setting | Details |
| --- | --- |
| Language bundles | Loaded from `languages/*.json`. |
| Selected language | Stored in local storage under `seider.language`. |
| Dark mode | Stored in local storage under `darkMode`. |
| Exchange rates | Fetched from `https://open.er-api.com/v6/latest/USD` and cached under `exchangeRates`. |
| Currency conversion | Uses USD as the base rate. |
| Route protection | Authenticated pages import `JS/auth-guard.js`. |

---

## Data Model

### User Document

```js
users/{uid} = {
  name: "<encrypted display name>",
  email: "<user email>",
  currency: "USD",
  language: "en",
  onboardingCompleted: true,
  entryCount: 0,
  profile: {
    gender: "no",
    ageRange: "no"
  },
  finance: {
    currentBalance: 0,
    incomeFrequency: "no",
    financialGoal: "no"
  }
}
```

### Entry Document

```js
users/{uid}/entries/{entryId} = {
  date: "<Firestore timestamp>",
  total: 0,
  notes: "<encrypted rich-text notes>",
  items: [
    {
      tag: "Food",
      subtag: "Groceries",
      plus: 0,
      minus: 25,
      receipt: {
        url: "<base64 or hosted receipt URL>",
        name: "receipt.jpg",
        type: "image/jpeg"
      }
    }
  ],
  tagTotals: {},
  subtagTotals: {}
}
```

### Tags and Subtags

```js
users/{uid}/tags/{tagId} = {
  name: "Food"
}

users/{uid}/tags/{tagId}/subtags/{subtagId} = {
  name: "Groceries"
}
```

---

## Development Notes

| Note | Details |
| --- | --- |
| Dependencies | The application currently uses CDN-hosted dependencies rather than local packages. |
| Testing | There is no automated test suite or build pipeline in the repository yet. |
| Firebase SDK | `auth-guard.js` imports Firebase Auth from version `10.7.1`, while the rest of the app uses Firebase `11.6.1`. Aligning versions would reduce the chance of SDK inconsistencies. |
| Encoding | Some UI strings appear with encoding artifacts in source files. Saving files consistently as UTF-8 would improve maintainability. |
| Receipts | Receipt handling includes both base64 conversion logic and storage upload helper code. Confirm the intended production storage strategy before shipping. |
| Local serving | Because the project uses browser ES modules, it should be tested through an HTTP server rather than opened directly from the filesystem. |

---

## Roadmap Ideas

| Priority Area | Ideas |
| --- | --- |
| Quality | Add automated tests for encryption, currency conversion, i18n, and finance calculations. |
| Receipts | Improve receipt storage with Firebase Storage rules and upload progress UI. |
| Product | Add more Smart Tools. |
| Usability | Improve interfaces for more intuitivity. |
| Mobile | Improve mobile design, especially graphs. |
