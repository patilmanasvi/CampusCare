// src/pages/ReportIssue.jsx
import React, { useState } from "react";
import { mockReportService } from "../mock/reportService";
import Card from "../components/common/Card";

export default function ReportIssue({ pcId }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      await mockReportService.submitIssue({ title, description, priority });
      setSuccess(true);
      // clear form fields after a successful submission
      setTitle("");
      setDescription("");
      setPriority("Medium");
    } catch (e) {
      setError(e?.message || "Failed to submit issue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6 mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Report an Issue</h2>
      {success && (
        <p className="text-green-600 mb-4">Issue reported successfully!</p>
      )}
      {error && (
        <p className="text-red-600 mb-4">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Issue title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded border p-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
        />
        <textarea
          placeholder="Describe the issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="rounded border p-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded border p-2 w-32 border-gray-300 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-dark-bg dark:text-white dark:placeholder-gray-500"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white rounded px-4 py-2 hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Issue"}
        </button>
      </form>
    </Card>
  );
}