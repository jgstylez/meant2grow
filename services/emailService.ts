import { getCloudFunctionUrl } from "./cloudFunctionsUrl";

/**
 * Client-side email entry points. Transactional email (welcome, password reset, etc.)
 * is sent from Cloud Functions with secrets — never from the browser.
 * Only admin/custom flows that POST to `sendAdminEmail` are exposed here.
 */
export const emailService = {
  sendCustomEmail: async (
    recipients: { email: string; name?: string; userId?: string }[],
    subject: string,
    body: string,
    fromAdmin?: { name: string; email: string },
    adminUserId?: string,
    organizationId?: string
  ) => {
    const response = await fetch(getCloudFunctionUrl("sendAdminEmail"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients,
        subject,
        body,
        fromAdmin,
        adminUserId,
        organizationId,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Failed to send email" }));
      throw new Error(
        (error as { error?: string }).error || "Failed to send email"
      );
    }

    return response.json();
  },
};
