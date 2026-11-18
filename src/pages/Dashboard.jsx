import React, { useEffect, useState } from 'react';
import { mockDashboardService } from '../mock/dashboardService';

const summaryLabels = [
  ['total', 'Total requests'],
  ['open', 'Open'],
  ['inProgress', 'In progress'],
  ['awaitingVerification', 'Awaiting verification'],
  ['resolved', 'Resolved'],
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      mockDashboardService.getSummary(),
      mockDashboardService.getRecentTickets(),
    ])
      .then(([nextSummary, recentTickets]) => {
        if (active) {
          setSummary(nextSummary);
          setTickets(recentTickets);
        }
      })
      .catch(() => {
        if (active) setError('Unable to load dashboard data.');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">Overview of lab support requests.</p>
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryLabels.map(([key, label]) => (
            <article key={key} className="rounded-lg bg-white p-4 shadow-card dark:bg-dark-bg">
              <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {summary[key]}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow-card dark:bg-dark-bg">
        <h3 className="p-4 text-lg font-semibold text-gray-900 dark:text-white">Recent requests</h3>
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-gray-600 dark:bg-dark-surface dark:text-gray-300">
            <tr>
              <th className="px-4 py-3 font-medium">Request</th>
              <th className="px-4 py-3 font-medium">PC</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Urgency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="text-gray-700 dark:text-gray-200">
                <td className="whitespace-nowrap px-4 py-3">{ticket.id}</td>
                <td className="whitespace-nowrap px-4 py-3">{ticket.pcCode}</td>
                <td className="px-4 py-3">{ticket.description}</td>
                <td className="whitespace-nowrap px-4 py-3">{ticket.date}</td>
                <td className="whitespace-nowrap px-4 py-3">{ticket.status}</td>
                <td className="whitespace-nowrap px-4 py-3">{ticket.urgency}</td>
              </tr>
            ))}
            {summary && tickets.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No recent requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
