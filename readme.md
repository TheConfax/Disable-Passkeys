# Disable Passkeys
A small Chrome and Firefox extension to block passkey (WebAuthn) prompts and their autofill.

<div align="center">

<a href="https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml"><img src="assets/CWS.png" alt="Available in the Chrome Web Store" height="58"></a>
<a href="https://addons.mozilla.org/firefox/addon/disable-passkeys/"><img src="assets/AMO.svg" alt="Get the Add-on for Firefox" height="58"></a>  
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/oapdndjfcfdeimbeemphceonhagcnlml?label=version&logo=googlechrome&logoColor=white&color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/stars/oapdndjfcfdeimbeemphceonhagcnlml?color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml?color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)  
[![Mozilla Add-on Version](https://img.shields.io/amo/v/disable-passkeys?label=version&logo=firefox&logoColor=white&color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)
[![Mozilla Add-on Rating](https://img.shields.io/amo/stars/disable-passkeys?label=rating&color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/disable-passkeys?color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)

<a href="https://ko-fi.com/theconfax"><img src="assets/ko-fi.png" alt="Support me on Ko-fi" height="34"></a>

</div>

## Why this?
As of 2026, this is the **only way** to truly and completely disable passkey prompts and passkey autofill in Chrome, and to have granular control over which ones you still see, by type and by site.

This project exists to give **control back to the user**.

Passkeys are increasingly pushed by browsers and websites, but they can:  
- Trigger unwanted system dialogs
- Create conflicts with password managers
- Be undesirable in shared or managed environments
- Break automation or specific password-based workflows

## What does it do?
This extension **blocks WebAuthn requests** and can be configured to block passkey login prompts, passkey creation prompts, and passkey autofill suggestions, independently.

<p align="center">
<img src="assets/main.png" alt="Main page" width="373" hspace="10">
<img src="assets/filters.png" alt="Filters page" width="373" hspace="10">
</p>

### Other features:
- Whitelist/blacklist domain filters
- Reactive UI showing hints and status
- 5 supported languages (🇬🇧 🇫🇷 🇩🇪 🇮🇹 🇪🇸)
- Adaptive light/dark mode UI
- Accessible UI with full keyboard navigation
- Settings synced cross-device

## Installation
**Install from the Chrome Web Store or from Firefox Add-ons**  
<div align="center">

<a href="https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml"><img src="assets/CWS.png" alt="Available in the Chrome Web Store" height="58"></a>
<a href="https://addons.mozilla.org/firefox/addon/disable-passkeys/"><img src="assets/AMO.svg" alt="Get the Add-on for Firefox" height="58"></a>  
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/oapdndjfcfdeimbeemphceonhagcnlml?label=version&logo=googlechrome&logoColor=white&color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/stars/oapdndjfcfdeimbeemphceonhagcnlml?color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml?color=4C8BF5)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)  
[![Mozilla Add-on Version](https://img.shields.io/amo/v/disable-passkeys?label=version&logo=firefox&logoColor=white&color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)
[![Mozilla Add-on Rating](https://img.shields.io/amo/stars/disable-passkeys?label=rating&color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/disable-passkeys?color=E66000)](https://addons.mozilla.org/firefox/addon/disable-passkeys/)

<a href="https://ko-fi.com/theconfax"><img src="assets/ko-fi.png" alt="Support me on Ko-fi" height="34"></a>

</div>

## Usage
### Main page
In the main page of the popup you can choose to selectively block/allow:
- ✅🚫 Passkey Login (WebAuthn `get()`, modal)
- ✅🚫 Passkey Autofill (WebAuthn `get()`, conditional mediation)
- ✅🚫 Passkey Creation (WebAuthn `create()`)

This page will also inform you if you have some filters active or if the extension is set to off.

### Advanced page
In the advanced page of the popup you can:
- 🏳️🏴 Choose to operate in whitelist/blacklist mode
- ➕➖ Add and remove domains from your list

Domains can be inserted in pretty much every format you like and will be parsed into something like `example.com`. You can also block IPv4s, IPv6s, and `localhost`.

### Action icon
The action icon shows a 🚫 when the extension is set to block something, and drops it when it isn't.

The action icon will flash a green `!` when WebAuthn is being blocked, interventions are counted in the "About" page.

The action icon will display a permanent yellow `!` when the configuration is set to blacklist no domain and some block toggle is armed, in order to warn the user of the misconfiguration.