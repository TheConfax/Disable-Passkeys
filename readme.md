# Disable Passkeys
A small Chrome extension to block passkey/WebAuthn login and creation prompts (per your toggle settings).

Available on the [![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v1.0.0-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)

## Why this?
As of 2026, this is the only way to truly and completely disable passkey prompts and passkey autofill in Chrome.

This project exists to give **control back to the user**.

Passkeys are increasingly pushed by browsers and websites, but they can:
- Interrupt existing password-based flows
- Trigger unwanted system dialogs
- Create conflicts with other password managers
- Break automation or specific workflows
- Be undesirable in shared or managed environments

## What does it do?
This extension rejects WebAuthn requests and can be configured to block login, creation, or both. Passkey entries in autofill will be blocked as well.

![Screenshot](assets/screenshot.png)

### Technically...
The `get()` and `create()` instances of `CredentialsContainer` return a promise that resolves when the credential is provided. This extension resolves that promise immediately with:
`Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));`
...disabling WebAuthn altogether.

## Installation
**Install from the Chrome Web Store**  
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v1.0.0-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/oapdndjfcfdeimbeemphceonhagcnlml)

***A note for paranoids:*** *the warning you get about reading/writing data on every website is automatically triggered due to `manifest.json` asking for `"host_permissions": ["<all_urls>"]`.*
*This is required to intervene in every instance were WebAuthn is invoked, regardless of the website URL.*

## Usage
1. Install the extension
2. Browse normally, passkey prompts will be blocked

In the extension popup you can change the configuration, choosing to selectively block/allow:
- ✅❌ Passkey Login/Autofill (`get()`)
- ✅❌ Passkey Creation (`create()`)