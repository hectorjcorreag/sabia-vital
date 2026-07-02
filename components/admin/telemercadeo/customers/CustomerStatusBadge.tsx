"use client";

import {
  getCustomerStatusLabel,
  getStatusBadgeClass,
} from "./customerUtils";

export default function CustomerStatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(
        status
      )}`}
    >
      {getCustomerStatusLabel(status)}
    </span>
  );
}