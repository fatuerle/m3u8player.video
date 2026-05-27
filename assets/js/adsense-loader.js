(function loadAdsense() {
  const config = window.SITE_CONFIG || {};
  const clientId = (config.adsenseClientId || "").trim();
  const units = config.adsenseUnits || {};
  const validClient = /^ca-pub-\d{16}$/.test(clientId);

  function initAdSlots() {
    const slots = document.querySelectorAll(".ad-slot[data-ad-slot]");
    slots.forEach((slotEl) => {
      const key = slotEl.getAttribute("data-ad-slot");
      const unit = (units[key] || "").trim();
      const validUnit = /^\d{10}$/.test(unit);

      if (!validClient || !validUnit) {
        slotEl.textContent = "";
        return;
      }

      if (slotEl.querySelector("ins.adsbygoogle")) return;
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", clientId);
      ins.setAttribute("data-ad-slot", unit);
      ins.setAttribute("data-full-width-responsive", "true");
      slotEl.appendChild(ins);

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {
        // Keep page functional if ad fill fails.
      }
    });
  }

  function loadAdScript() {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + clientId;
      document.head.appendChild(script);
    }
    initAdSlots();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // GDPR Consent Gate:
    // Only load AdSense if the user has explicitly accepted cookies (cookie_ok === "1").
    // If consent is absent or declined, ad slots are left empty and no tracking
    // scripts are injected — satisfying GDPR Article 6(1)(a) requirements.
    const consent = localStorage.getItem("cookie_ok");

    if (!validClient) {
      // No valid publisher ID configured yet — skip ad loading entirely.
      initAdSlots();
      return;
    }

    if (consent === "1") {
      // User accepted — load AdSense normally.
      loadAdScript();
    } else {
      // No consent yet or declined — keep slots empty, do not inject any scripts.
      initAdSlots();
    }
  });

  // Listen for runtime consent changes (e.g. user clicks Accept on the banner
  // after the page has already loaded) so ads appear without a page reload.
  window.addEventListener("adsense:consent-granted", () => {
    if (validClient) loadAdScript();
  });
})();
