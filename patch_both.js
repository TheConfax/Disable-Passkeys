(() => {
  const deny = () => Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));

  try {
    const proto = globalThis.CredentialsContainer && CredentialsContainer.prototype;
    if (!proto || proto.__nuke_both__) return;
    proto.__nuke_both__ = true;

    const ogGet = proto.get;
    const ogCreate = proto.create;

    if (typeof ogGet === "function") {
      Object.defineProperty(proto, "get", {
        configurable: true,
        writable: true,
        value: function (options) {
          if (options && options.publicKey) return deny();
          return ogGet.call(this, options);
        }
      });
    }

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
