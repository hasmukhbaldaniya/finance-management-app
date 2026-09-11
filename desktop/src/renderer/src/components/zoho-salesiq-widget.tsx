import { useEffect } from "react";

// Ported from frontend/src/components/zoho-salesiq-widget.tsx. Same
// canonical Zoho embed shape (an inline init script defining
// window.$zoho.salesiq.ready, then the external loader script that reads
// the widget code off its own src URL) — only the loading mechanism changes,
// since there's no next/script here: plain DOM <script> injection in an
// effect, matching what next/script's "afterInteractive" strategy actually
// does under the hood.
//
// CSP note for whoever wires up a real widget URL (Phase 6 / Help screen):
// src/renderer/index.html's `script-src 'self'` blocks this until the
// Zoho host is added to that directive — deliberately not done here since
// VITE_ZOHO_SALESIQ_WIDGET_URL is unset in desktop/.env today, so this
// component returns without touching the DOM at all.
const WIDGET_SCRIPT_URL = import.meta.env["VITE_ZOHO_SALESIQ_WIDGET_URL"] as string | undefined;

type ZohoSalesIq = {
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

export function ZohoSalesIqWidget({
  visitorName,
  visitorEmail,
  organizationName,
  onAvailabilityChange,
}: ZohoSalesIqWidgetProps): null {
  useEffect(() => {
    if (!WIDGET_SCRIPT_URL) return;

    const readyCallbackBody = [
      `if (visitor && visitor.name) visitor.name(${JSON.stringify(visitorName)});`,
      `if (visitor && visitor.email) visitor.email(${JSON.stringify(visitorEmail)});`,
      organizationName ? `if (visitor && visitor.info) visitor.info({ Organization: ${JSON.stringify(organizationName)} });` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const initScript = document.createElement("script");
    initScript.id = "zsiq-init";
    initScript.text = `
      window.$zoho = window.$zoho || {};
      window.$zoho.salesiq = window.$zoho.salesiq || {
        ready: function () {
          try {
            var visitor = window.$zoho.salesiq.visitor;
            ${readyCallbackBody}
          } catch (e) {}
        }
      };
    `;
    document.body.appendChild(initScript);

    const loaderScript = document.createElement("script");
    loaderScript.id = "zsiqscript";
    loaderScript.src = WIDGET_SCRIPT_URL;
    loaderScript.onload = () => onAvailabilityChange(true);
    loaderScript.onerror = () => onAvailabilityChange(false);
    document.body.appendChild(loaderScript);

    return () => {
      initScript.remove();
      loaderScript.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once, matching the original's plain conditional render
  }, []);

  return null;
}
