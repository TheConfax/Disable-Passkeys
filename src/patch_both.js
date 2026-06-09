(() => {
  const BLOCK_GET = true;
  const BLOCK_CREATE = true;

  const deny = () => {
    window.dispatchEvent(new CustomEvent("disable-passkeys-intervention"));
    return Promise.reject(new DOMException("WebAuthn disabled", "NotAllowedError"));
  };

  // Wrap an original get/create so publicKey requests are denied when armed.
  const guard = (orig, block) => function (options) {
    if (block && options && options.publicKey) return deny();
    return orig.call(this, options);
  };

  try {
    // Fast path: patch the prototype (covers the common, single-injector case).
    const proto = globalThis.CredentialsContainer && CredentialsContainer.prototype;
    if (proto && !proto.__nuke_both__) {
      proto.__nuke_both__ = true;
      const ogGet = proto.get;
      const ogCreate = proto.create;
      if (typeof ogGet === "function") {
        Object.defineProperty(proto, "get", {
          configurable: true, writable: true, value: guard(ogGet, BLOCK_GET)
        });
      }
      if (typeof ogCreate === "function") {
        Object.defineProperty(proto, "create", {
          configurable: true, writable: true, value: guard(ogCreate, BLOCK_CREATE)
        });
      }
    }

    // Defense: another MAIN-world injector (e.g. a password manager) may install
    // get/create as non-configurable OWN properties on the navigator.credentials
    // instance, which shadows the prototype patch above. Take over the
    // Navigator.prototype.credentials accessor and hand back a hardened container
    // whose get/create are locked, so we win regardless of injection order.
    const NavProto = globalThis.Navigator && Navigator.prototype;
    if (NavProto && !NavProto.__nuke_credentials__) {
      const desc = Object.getOwnPropertyDescriptor(NavProto, "credentials");
      if (desc && desc.configurable && typeof desc.get === "function") {
        const origGetter = desc.get;
        const cache = new WeakMap();
        const harden = (real) => {
          if (!real) return real;
          let w = cache.get(real);
          if (w) return w;
          // Keep the real prototype so `instanceof CredentialsContainer` holds.
          w = Object.create(Object.getPrototypeOf(real));
          const realGet = (o) => real.get(o);
          const realCreate = (o) => real.create(o);
          Object.defineProperty(w, "get", {
            configurable: false, enumerable: false, value: guard(realGet, BLOCK_GET)
          });
          Object.defineProperty(w, "create", {
            configurable: false, enumerable: false, value: guard(realCreate, BLOCK_CREATE)
          });
          // Delegate the remaining standard methods to the real container.
          for (const m of ["preventSilentAccess", "store"]) {
            if (typeof real[m] === "function") {
              Object.defineProperty(w, m, {
                configurable: true, enumerable: false, value: real[m].bind(real)
              });
            }
          }
          cache.set(real, w);
          return w;
        };
        Object.defineProperty(NavProto, "credentials", {
          configurable: true,
          enumerable: desc.enumerable,
          get() { return harden(origGetter.call(this)); }
        });
        NavProto.__nuke_credentials__ = true;
      }
    }
  } catch (_) {}
})();
