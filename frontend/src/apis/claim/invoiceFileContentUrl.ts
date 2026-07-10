import { API_BASE_URL } from "@/utils/apiManager/apiManager";

// A raw URL, not a fetch call — consumed directly as an <img>/<iframe> src
// for the "Preview Invoices" column. The session cookie rides along
// automatically since the frontend/backend dev ports are same-site
// (SameSite cookie rules key off registrable domain, not port), matching
// how every other cookie-authenticated request in this app already works.
export function getInvoiceFileContentUrl(claimId: number, fileId: number): string {
  return `${API_BASE_URL}/claims/${claimId}/invoice-files/${fileId}/content`;
}
