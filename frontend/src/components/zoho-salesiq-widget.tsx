"use client";

import Script from "next/script";

const WIDGET_CODE = process.env.NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_CODE;

// The narrow slice of Zoho SalesIQ's global object this file touches —
// `unknown`-typed methods are called defensively (optional chaining,
// try/catch) rather than trusting this shape exactly, since Zoho's real SDK
// surface is versioned and not something this codebase controls (017's Open
// Questions flags this explicitly — verify against Zoho's current JS API
// docs before relying on any specific method name here).
type ZohoSalesIq = {
  widgetcode?: string;
  values?: Record<string, unknown>;
  ready?: () => void;
  visitor?: {
    name?: (value: string) => void;
    email?: (value: string) => void;
    info?: (value: Record<string, string>) => void;
  };
  floatwindow?: {
    visible?: (state: "show" | "hide") => void;
  };
};

declare global {
  interface Window {
    $zoho?: { salesiq?: ZohoSalesIq };
  }
}

// Opens the floating chat panel programmatically — used by the Help page's
// "Chat with Us" button (017's third story). No-ops silently if the widget
// never loaded, matching this integration's fail-silent posture throughout.
export function openZohoSalesIqChat(): void {
  try {
    window.$zoho?.salesiq?.floatwindow?.visible?.("show");
  } catch {
    // Swallow — a support widget that won't open is a degraded experience,
    // not an application error worth surfacing to the employee.
  }
}

type ZohoSalesIqWidgetProps = {
  visitorName: string;
  visitorEmail: string;
  organizationName: string | null;
  onAvailabilityChange: (isAvailable: boolean) => void;
};

// Loads the Zoho SalesIQ embed script once per session (mounted by
// SessionProvider, alongside Header) and identifies the visitor once the
// widget is ready — 017's first two stories. Renders nothing itself; the
// floating launcher is Zoho's own injected UI, not React-rendered here.
//
// Follows Zoho's own canonical embed shape: an inline script sets up
// `window.$zoho.salesiq` (widgetcode + a `ready` callback) *before* the
// external loader script is added, since that external script reads this
// config once it starts executing. Visitor values are JSON-encoded before
// being embedded in the inline script text, so they're safe JS string
// literals regardless of content — not raw string concatenation into a
// <script> tag.
export function ZohoSalesIqWidget({ visitorName, visitorEmail, organizationName, onAvailabilityChange }: ZohoSalesIqWidgetProps) {
  if (!WIDGET_CODE) {
    return null;
  }

  const readyCallbackBody = [
    `if (visitor && visitor.name) visitor.name(${JSON.stringify(visitorName)});`,
    `if (visitor && visitor.email) visitor.email(${JSON.stringify(visitorEmail)});`,
    organizationName ? `if (visitor && visitor.info) visitor.info({ Organization: ${JSON.stringify(organizationName)} });` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initScript = `
    window.$zoho = window.$zoho || {};
    window.$zoho.salesiq = window.$zoho.salesiq || {
      widgetcode: ${JSON.stringify(WIDGET_CODE)},
      values: {},
      ready: function () {
        try {
          var visitor = window.$zoho.salesiq.visitor;
          ${readyCallbackBody}
        } catch (e) {}
      }
    };
  `;

  return (
    <>
      <Script id="zsiq-init" strategy="afterInteractive">
        {initScript}
      </Script>
      <Script
        id="zsiqscript"
        strategy="afterInteractive"
        src="https://salesiq.zohopublic.com/widget"
        onLoad={() => onAvailabilityChange(true)}
        onError={() => onAvailabilityChange(false)}
      />
    </>
  );
}
