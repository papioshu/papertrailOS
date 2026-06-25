// CRM pipeline statuses. Kept as a string union (not a DB enum) so the set can
// evolve without a migration. Order reflects normal lead progression.
export const LEAD_STATUSES = [
  "New",
  "Researching",
  "Enriched",
  "Audited",
  "Graded",
  "Qualified",
  "Needs Review",
  "Draft Ready",
  "Approved",
  "Queued",
  "Contacted",
  "Follow Up 1",
  "Follow Up 2",
  "Replied",
  "Interested",
  "Not Interested",
  "Not Fit",
  "Do Not Contact",
  "Opted Out",
  "Customer",
  "Archived",
  "Closed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Statuses that move a lead out of the active working set into the archive.
export const ARCHIVED_STATUSES: ReadonlySet<string> = new Set([
  "Customer",
  "Archived",
  "Closed",
  "Not Fit",
  "Do Not Contact",
  "Opted Out",
]);

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}
