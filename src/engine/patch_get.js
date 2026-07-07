(() => {
  const TARGET_GET = true;
  const TARGET_CREATE = false;

  const report = () => window.dispatchEvent(new CustomEvent("disable-passkeys-intervention"));
  const DEBUG = window.ENV && window.ENV.ENABLE_DEBUG;
  const log = (method, via) => { if (DEBUG) console.log(`Debug: passkey ${method} disabled via ${via}`); };

  const isPolicyDenial = (err) =>
    err?.name === "NotAllowedError" && /not enabled in this document/i.test(err.message || "");

  const api = document.featurePolicy;
  const mustBlock = (feature) =>
    !api || typeof api.allowsFeature !== "function" || api.allowsFeature(feature) === true;

  const guard = (call, block, name) => block
    // API-level block: reject the call in-page if the DNR header is overwritten by another extension.
    ? function (options) {
        if (options?.publicKey) { report(); log(name, "API"); return Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError")); }
        return call.call(this, options);
      }
    // DNR block: just count the denial if the DNR header is healthy.
    : function (options) {
        const result = call.call(this, options);
        if (options?.publicKey && typeof result?.then === "function")
          result.then(null, (err) => { if (isPolicyDenial(err)) { report(); log(name, "DNR"); } });
        return result;
      };

  const BLOCK_GET = TARGET_GET && mustBlock("publickey-credentials-get");
  const BLOCK_CREATE = TARGET_CREATE && mustBlock("publickey-credentials-create");

  try {
    const navProto = globalThis.Navigator?.prototype;
    const slot = navProto && Object.getOwnPropertyDescriptor(navProto, "credentials");
    if (!navProto || navProto.__dp_watched__ || !slot?.configurable || typeof slot.get !== "function") return;

    const nativeGetter = slot.get;
    const proxies = new WeakMap();

    const wrap = (container) => {
      if (!container) return container;
      const cached = proxies.get(container);
      if (cached) return cached;

      const proxy = Object.create(Object.getPrototypeOf(container));
      const set = (name, value, locked) =>
        Object.defineProperty(proxy, name, { value, configurable: !locked, writable: !locked, enumerable: false });

      set("get", TARGET_GET ? guard((o) => container.get(o), BLOCK_GET, "get") : container.get.bind(container), BLOCK_GET);
      set("create", TARGET_CREATE ? guard((o) => container.create(o), BLOCK_CREATE, "create") : container.create.bind(container), BLOCK_CREATE);
      for (const method of ["store", "preventSilentAccess"]) {
        if (typeof container[method] === "function") set(method, container[method].bind(container), false);
      }

      proxies.set(container, proxy);
      return proxy;
    };

    Object.defineProperty(navProto, "credentials", {
      configurable: true,
      enumerable: slot.enumerable,
      get() { return wrap(nativeGetter.call(this)); },
    });
    navProto.__dp_watched__ = true;
  } catch {}
})();
