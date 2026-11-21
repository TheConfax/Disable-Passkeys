(() => {
  const TARGET_MODAL = false;
  const TARGET_CONDITIONAL = true;
  const TARGET_CREATE = false;

  const TARGET_GET = TARGET_MODAL || TARGET_CONDITIONAL;

  const report = () => window.dispatchEvent(new CustomEvent("disable-passkeys-intervention"));
  const DEBUG = window.ENV && window.ENV.ENABLE_DEBUG;
  const log = (method) => { if (DEBUG) console.log(`Debug: passkey ${method} disabled`); };

  const hitsGet = (options) => options.mediation === "conditional" ? TARGET_CONDITIONAL : TARGET_MODAL;

  // Native conditional get stays pending until aborted; rejecting at once makes retry-on-error sites spin forever.
  const pending = (signal) => new Promise((_, reject) => {
    const abort = () => reject(signal.reason);
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
  });

  const guard = (call, name, hits) => function (options) {
    if (options?.publicKey && hits(options)) {
      report(); log(name);
      return name === "get" && options.mediation === "conditional"
        ? pending(options.signal)
        : Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));
    }
    return call.call(this, options);
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

      const proxy = Object.create(Object.getPrototypeOf(container));
      const set = (name, value, locked) =>
        Object.defineProperty(proxy, name, { value, configurable: !locked, writable: !locked, enumerable: false });

      set("get", TARGET_GET ? guard((o) => container.get(o), "get", hitsGet) : container.get.bind(container), TARGET_GET);
      set("create", TARGET_CREATE ? guard((o) => container.create(o), "create", () => true) : container.create.bind(container), TARGET_CREATE);
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
