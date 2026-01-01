(() => {
  const deny = () => Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));

  try {
    const proto = globalThis.CredentialsContainer && CredentialsContainer.prototype;
    if (!proto || proto.__nuke_get__) return;
    proto.__nuke_get__ = true;

    const ogGet = proto.get;

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
  } catch (_) {}
})();
