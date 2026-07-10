import { downloadFile } from "@/utils/apiManager/apiManager";

// Fetched as an authenticated Blob (credentials: "include", same as every
// other API call), not a plain <img src="..."> URL — a raw cross-origin
// <img>/<iframe> src depends on the browser deciding to attach the session
// cookie to a subresource request, which is exactly the kind of thing that
// varies across browsers/privacy settings and silently renders a broken
// image instead of failing loudly. Callers turn this Blob into an object
// URL (URL.createObjectURL) and revoke it when done.
export function getInvoiceFileContent(claimId: number, fileId: number): Promise<Blob> {
  return downloadFile(`/claims/${claimId}/invoice-files/${fileId}/content`);
}
