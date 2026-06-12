(() => {
  const report = () => window.dispatchEvent(new CustomEvent("disable-passkeys-intervention"));

  // Chrome's generic policy-denial wording; separates a real block from a timeout or cancelled prompt (both also NotAllowedError).
  const isPolicyDenial = (err) =>
    err?.name === "NotAllowedError" && /not enabled in this document/i.test(err.message || "");

  const watch = (call) => function (options) {
    const result = call.call(this, options);
    if (options?.publicKey && typeof result?.then === "function") {
      result.then(null, (err) => { if (isPolicyDenial(err)) report(); });
    }
    return result;
  };

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

      const proxy = Object.create(Object.getPrototypeOf(container)); // keeps instanceof CredentialsContainer
      const define = (name, value) =>
        Object.defineProperty(proxy, name, { value, configurable: true, writable: true, enumerable: false });

      define("get", watch((o) => container.get(o)));
      define("create", watch((o) => container.create(o)));
      for (const method of ["store", "preventSilentAccess"]) {
        if (typeof container[method] === "function") define(method, container[method].bind(container));
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
