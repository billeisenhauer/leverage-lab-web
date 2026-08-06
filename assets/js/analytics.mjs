const CONSENT_KEY = "leverage_lab_analytics_consent_v1";
const ACCEPTED = "accepted";
const DECLINED = "declined";
const banner = document.querySelector("[data-cookie-consent]");
const measurementId = String(window.leverageAnalyticsConfig?.measurementId || "").trim();
let volatileConsent = null;
let analyticsLoaded = false;

function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) || volatileConsent;
  } catch (_error) {
    return volatileConsent;
  }
}

function writeConsent(value) {
  volatileConsent = value;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch (_error) {
    // The choice still applies for this page when storage is unavailable.
  }
}

function loadAnalytics() {
  if (!measurementId || analyticsLoaded || readConsent() !== ACCEPTED) return;

  window[`ga-disable-${measurementId}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  analyticsLoaded = true;
}

function removeAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => name.startsWith("_ga"));
  const domains = [window.location.hostname, `.${window.location.hostname}`];

  names.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
    });
  });
}

function showBanner({ moveFocus = false } = {}) {
  if (!banner) return;
  banner.hidden = false;
  if (moveFocus) banner.querySelector("#cookie-consent-title")?.focus();
}

function hideBanner() {
  if (banner) banner.hidden = true;
}

function acceptAnalytics() {
  writeConsent(ACCEPTED);
  hideBanner();
  loadAnalytics();
}

function declineAnalytics() {
  writeConsent(DECLINED);
  if (measurementId) window[`ga-disable-${measurementId}`] = true;
  removeAnalyticsCookies();
  hideBanner();
}

function track(name, parameters = {}) {
  if (readConsent() !== ACCEPTED || typeof window.gtag !== "function") return;
  window.gtag("event", name, parameters);
}

window.leverageAnalytics = Object.freeze({ track });

banner?.querySelector("[data-cookie-accept]")?.addEventListener("click", acceptAnalytics);
banner?.querySelector("[data-cookie-decline]")?.addEventListener("click", declineAnalytics);
document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
  button.addEventListener("click", () => showBanner({ moveFocus: true }));
});

if (readConsent() === ACCEPTED) {
  loadAnalytics();
} else if (readConsent() !== DECLINED) {
  showBanner();
}
