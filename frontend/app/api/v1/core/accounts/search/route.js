/**
 * Mock API: Account Search
 * --------------------------------------------------------------------
 * Next.js Route Handler (App Router) that simulates the backend's
 *   POST /api/v1/core/accounts/search
 * endpoint. Returns mock account statement data so the full
 * Form → Dispatcher → Grid flow can be demonstrated without
 * a running Spring Boot backend.
 *
 * Remove this file once the real backend is wired in.
 */

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Malformed JSON — proceed with empty body
  }

  const accountNo = body?.accountNo ?? "unknown";

  // Simulate a small processing delay (200ms)
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mock response: account statement rows
  const mockStatements = [
    {
      id: 1,
      transactionDate: "2026-10-01",
      description: "Opening Balance",
      debit: null,
      credit: 50000.0,
      balance: 50000.0,
    },
    {
      id: 2,
      transactionDate: "2026-10-03",
      description: "ATM Withdrawal — Branch BR001",
      debit: 5000.0,
      credit: null,
      balance: 45000.0,
    },
    {
      id: 3,
      transactionDate: "2026-10-05",
      description: "NEFT Transfer — Payee: ABC Corp",
      debit: 12000.0,
      credit: null,
      balance: 33000.0,
    },
    {
      id: 4,
      transactionDate: "2026-10-07",
      description: "Salary Credit",
      debit: null,
      credit: 85000.0,
      balance: 118000.0,
    },
    {
      id: 5,
      transactionDate: "2026-10-10",
      description: "Utility Bill Payment — Electricity",
      debit: 3200.0,
      credit: null,
      balance: 114800.0,
    },
  ];

  return Response.json(mockStatements, {
    status: 200,
    headers: { "X-Mock-Account": accountNo },
  });
}
