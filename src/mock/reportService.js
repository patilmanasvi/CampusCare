// src/mock/reportService.js
/**
 * Mock service for submitting issue reports.
 * In a real app this would POST to a backend endpoint.
 * Here we just simulate a short async delay and resolve.
 */
export const mockReportService = {
  submitIssue: async ({ title, description, priority }) => {
    // Basic validation – mimic server‑side checks
    if (!title?.trim()) throw new Error("Title is required");
    if (!description?.trim()) throw new Error("Description is required");
    // Simulate network latency (200‑300 ms)
    await new Promise((res) => setTimeout(res, 250));
    console.log("Mock issue submitted", { title, description, priority });
    // Resolves successfully
    return { success: true, id: Date.now() };
  },
};
