import React from "react";

export function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
