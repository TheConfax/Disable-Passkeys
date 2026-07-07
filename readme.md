# Disable Passkeys
A small Chrome extension to block passkey (WebAuthn) prompts and their autofill.

<div align="center">

[![Available in the Chrome Web Store](assets/chrome-webstore.png)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)  
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/oapdndjfcfdeimbeemphceonhagcnlml?label=version)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Stars](https://img.shields.io/chrome-web-store/stars/oapdndjfcfdeimbeemphceonhagcnlml?color=blue)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml?color=blue)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)

[![Support](https://img.shields.io/badge/ko--fi-support-FF6433?logo=kofi&logoColor=white)](https://ko-fi.com/theconfax)  

</div>

## Why this?
As of 2026, this is the **only way** to truly and completely disable passkey prompts and passkey autofill in Chrome.

This project exists to give **control back to the user**.

Passkeys are increasingly pushed by browsers and websites, but they can:  
- Trigger unwanted system dialogs
- Create conflicts with password managers
- Be undesirable in shared or managed environments
- Break automation or specific password-based workflows

## What does it do?
This extension **disables WebAuthn requests** and can be configured to block passkey login, creation, or both. Passkey entries in autofill will be blocked as well.

<p align="center">
<img src="assets/main.png" alt="Main page" width="373" hspace="10">
<img src="assets/filters.png" alt="Filters page" width="373" hspace="10">
</p>

The new [v2.x](https://github.com/theconfax/disable-passkeys/releases/tag/v2.0.0) blocking engine turns off the browser's native WebAuthn support while letting password managers create and log in with their own passkeys.

This disables the native passkey autofill prompt but lets you use passkeys with your manager of choice, [except with conflicting ad-blockers](https://github.com/theconfax/disable-passkeys/releases/tag/v2.1.0).

### Other features:
- Whitelist/blacklist domain filters
- Reactive UI showing hints and status
- 5 supported languages (🇬🇧 🇫🇷 🇩🇪 🇮🇹 🇪🇸)
- Adaptive light/dark mode UI
- Accessible UI with full keyboard navigation
- Settings synced cross-device

## Installation
**Install from the Chrome Web Store**  
<div align="center">

[![Available in the Chrome Web Store](assets/chrome-webstore.png)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)  
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/oapdndjfcfdeimbeemphceonhagcnlml?label=version)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Stars](https://img.shields.io/chrome-web-store/stars/oapdndjfcfdeimbeemphceonhagcnlml?color=blue)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml?color=blue)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)

[![Support](https://img.shields.io/badge/ko--fi-support-FF6433?logo=kofi&logoColor=white)](https://ko-fi.com/theconfax)  

</div>

## Usage
### Main page
In the main page of the popup you can choose to selectively block/allow:
- ✅❌ Passkey Login/Autofill (Blocking WebAuthn `get()`)
- ✅❌ Passkey Creation (Blocking WebAuthn `create()`)

This page will also inform you if you have some filters active or if the extension is set to off.

### Advanced page
In the advanced page of the popup you can:
- 🏳️🏴 Choose to operate in whitelist/blacklist mode
- ➕➖ Add and remove domains from your list

Domains can be inserted in pretty much every format you like and will be parsed into something like `example.com`. You can also block IPv4s, IPv6s, and `localhost`.

### Action icon
The action icon will display if the extension is on with the presence/absence of a 🚫.

The action icon will flash a green `!` when WebAuthn is being blocked, interventions are counted in the "About" page.

The action icon will display a permanent yellow `!` when the configuration is set to blacklist no domain and some block toggle is armed, in order to warn the user of the misconfiguration.