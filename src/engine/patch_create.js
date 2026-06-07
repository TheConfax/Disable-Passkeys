(() => {
  const deny = () => {
    window.dispatchEvent(new CustomEvent("disable-passkeys-intervention"));
    return Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));
  };

  try {
    const proto = globalThis.CredentialsContainer && CredentialsContainer.prototype;
    if (!proto || proto.__nuke_create__) return;
    proto.__nuke_create__ = true;

    const ogCreate = proto.create;

    if (typeof ogCreate === "function") {
      Object.defineProperty(proto, "create", {
        configurable: true,
        writable: true,
        value: function (options) {
          if (options && options.publicKey) return deny();
          return ogCreate.call(this, options);
        }
      });
    }
  } catch (_) {}
})();
