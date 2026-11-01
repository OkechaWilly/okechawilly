"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  artwork_id: string | null;
  status: string;
  created_at: string;
};

const statuses = ["new", "in_progress", "replied", "closed"];
const field = "border border-[#d9d4ca] bg-white px-3 py-2.5 text-xs outline-none transition-colors focus:border-[#9c8062]";
const label = "text-[10px] uppercase tracking-[.14em] text-[#89847c]";

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InquiriesManager({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialInquiries);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const visible = items.filter((item) => {
    const matchesStatus = filter === "all" || item.status === filter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [item.name, item.email, item.subject, item.message]
      .some((value) => value?.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  async function update(item: Inquiry, status: string) {
    setBusy(item.id);
    setNotice("");
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", item.id);
    if (error) {
      setNotice(error.message);
    } else {
      const next = { ...item, status };
      setItems((old) => old.map((entry) => entry.id === item.id ? next : entry));
      setSelected(next);
      setNotice("Enquiry status updated.");
    }
    setBusy("");
  }

  return (
    <section>
      <p className="eyebrow">Studio workspace</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">Collector enquiries.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#77736d]">
        A central inbox for artwork questions, commission requests, print enquiries and collaborations.
      </p>

      {notice && <p role="status" className="mt-6 border border-[#d9d4ca] bg-white px-4 py-3 text-sm">{notice}</p>}

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        <div className="border border-[#dedad2] bg-white p-5">
          <p className="eyebrow">All enquiries</p>
          <p className="display mt-2 text-3xl">{items.length}</p>
        </div>
        <div className="border border-[#dedad2] bg-white p-5">
          <p className="eyebrow">New</p>
          <p className="display mt-2 text-3xl">{items.filter((item) => item.status === "new").length}</p>
        </div>
        <div className="border border-[#dedad2] bg-white p-5">
          <p className="eyebrow">In progress</p>
          <p className="display mt-2 text-3xl">{items.filter((item) => item.status === "in_progress").length}</p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-b border-[#dedad2] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className={label}>{visible.length} {visible.length === 1 ? "enquiry" : "enquiries"} shown</p>
          <p className="mt-1 text-xs text-[#89847c]">Search the sender, subject or message.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Search enquiries"
            className={field + " min-w-0 sm:w-64"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search enquiries..."
          />
          <select aria-label="Filter enquiries by status" className={field} value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        </div>
      </div>

      {visible.length ? (
        <div className="divide-y divide-[#e2ded6]">
          {visible.map((item) => (
            <button
              key={item.id}
              onClick={() => { setSelected(item); setNotice(""); }}
              className="grid w-full gap-3 py-5 text-left transition-colors hover:bg-[#f7f6f2] sm:grid-cols-[1fr_1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.14em] text-[#9c8062]">{item.subject || "General enquiry"}</p>
                <p className="display mt-1 truncate text-xl">{item.name}</p>
                <p className="mt-1 truncate text-xs text-[#89847c]">{item.email}</p>
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs leading-6 text-[#77736d]">{item.message}</p>
                <p className="mt-2 text-[10px] text-[#a09a90]">{formatDate(item.created_at)}</p>
              </div>
              <span className="w-fit border border-[#d9d4ca] px-3 py-1.5 text-[9px] uppercase tracking-[.12em]">{formatStatus(item.status)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-14 text-center">
          <p className="display text-2xl">{search || filter !== "all" ? "No matching enquiries." : "No enquiries yet."}</p>
          <p className="mt-3 text-xs text-[#89847c]">
            {search || filter !== "all" ? "Try another search term or status filter." : "Messages submitted through the public contact form will appear here."}
          </p>
          {(search || filter !== "all") && <button className="mt-5 text-xs underline underline-offset-4" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Enquiry details"
            onClick={(event) => event.stopPropagation()}
            className="h-full w-full max-w-xl overflow-y-auto bg-[#f8f7f3] p-6 md:p-9"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="eyebrow">Enquiry details</p>
                <h2 className="display mt-2 text-3xl">{selected.subject || "General enquiry"}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="h-fit text-xs underline underline-offset-4">Close</button>
            </div>

            <div className="mt-8">
              <p className="text-sm">{selected.name}</p>
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: " + (selected.subject || "Your enquiry"))}`}
                className="mt-1 inline-block text-sm text-[#9c8062] underline underline-offset-4"
              >
                {selected.email} ↗
              </a>
            </div>

            <div className="mt-7 border-y border-[#dedad2] py-6">
              <p className={label}>Message</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#34322e]">{selected.message}</p>
            </div>

            <p className="mt-5 text-xs text-[#89847c]">Received {formatDate(selected.created_at)}</p>
            <p className="eyebrow mt-8">Enquiry status</p>
            <select
              disabled={busy === selected.id}
              className={field + " mt-3 w-full"}
              value={selected.status}
              onChange={(event) => update(selected, event.target.value)}
            >
              {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
            <p className="mt-3 text-xs leading-5 text-[#89847c]">Update the status as you handle the request. Use the email link above to reply directly from your email application.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
