"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiErrorMessage } from "@/lib/api-error";
import type { AnalysisIntent } from "@/lib/analysis-intent";

type AnalysisItem = {
  headline: string;
  attention_level: "high_attention" | "important" | "document_quality";
  legal_gibberish: string;
  danger: string;
  fix: string;
  location: string;
};

type AnalysisReport = {
  agreement_snapshot: {
    reviewed_for?: string;
    agreement_type: string;
    provider: string;
    counterparty_label?: string;
    term: string;
    what_you_get?: string[];
    what_you_pay?: string[];
    what_you_commit_to?: string[];
  };
  total_flags: number;
  categories_found: string[];
  protections?: Array<{
    headline: string;
    explanation: string;
    location: string;
  }>;
  detailed_analysis: AnalysisItem[];
  informational_notice?: string;
};

type PreviewItem = Pick<AnalysisItem, "headline" | "attention_level" | "location">;

function isAnalysisItem(item: AnalysisItem | PreviewItem): item is AnalysisItem {
  return "legal_gibberish" in item && "danger" in item && "fix" in item;
}

const attentionOrder = {
  high_attention: 0,
  important: 1,
  document_quality: 2,
} as const;

function attentionPresentation(level: AnalysisItem["attention_level"]) {
  if (level === "high_attention") {
    return { label: "High attention", classes: "border-red-200 bg-red-50 text-red-900" };
  }
  if (level === "document_quality") {
    return { label: "Document-quality concern", classes: "border-sky-200 bg-sky-50 text-sky-900" };
  }
  return { label: "Important to understand", classes: "border-amber-200 bg-amber-50 text-amber-900" };
}

function FindingCard({ item }: { item: AnalysisItem | PreviewItem }) {
  const attention = attentionPresentation(item.attention_level);
  return (
    <article className="rounded-2xl border border-brand-border p-5">
      <span className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] ${attention.classes}`}>
        {attention.label}
      </span>
      <h2 className="mt-2 font-fraunces text-xl font-semibold text-brand-indigo">{item.headline}</h2>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">{item.location}</p>
      {isAnalysisItem(item) ? (
        <div className="mt-4 space-y-3 text-sm leading-6">
          <p><strong>In plain English:</strong> {item.legal_gibberish}</p>
          <p><strong>What it means:</strong> {item.danger}</p>
          <p><strong>Your contract-based next step:</strong> {item.fix}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-brand-action">Explanation included in the full report.</p>
      )}
    </article>
  );
}

type ReportResponse = {
  error?: string;
  request_id?: string;
  intent: AnalysisIntent;
  paid: boolean;
  full_report_preview: boolean;
  payment_status: string;
  checkout_enabled: boolean;
  checkout_token?: string;
  report_expires_at: string;
  preview: {
    agreement_snapshot: AnalysisReport["agreement_snapshot"];
    total_flags: number;
    categories_found: string[];
    flag_previews: PreviewItem[];
  };
  report?: AnalysisReport;
  local_fixture?: boolean;
};

export default function ReportClient({ contractId }: { contractId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "deleted" }
    | { status: "error"; message: string }
    | { status: "ready"; data: ReportResponse; token: string }
  >({ status: "loading" });
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const displayedItems = state.status === "ready"
    ? [...(state.data.report?.detailed_analysis ?? state.data.preview.flag_previews)].sort(
        (a, b) => attentionOrder[a.attention_level] - attentionOrder[b.attention_level],
      )
    : [];
  const highAttentionCount = displayedItems.filter(
    (item) => item.attention_level === "high_attention",
  ).length;
  const highAttentionItems = displayedItems.filter((item) => item.attention_level === "high_attention");
  const remainingItems = displayedItems.filter((item) => item.attention_level !== "high_attention");

  useEffect(() => {
    const storageKey = `explain-my-contract:${contractId}`;
    const hashToken = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (hashToken) window.sessionStorage.setItem(storageKey, hashToken);
    const token = hashToken ?? window.sessionStorage.getItem(storageKey);
    if (!token) {
      const timeout = window.setTimeout(() => {
        setState({ status: "error", message: "This private report link is incomplete." });
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    const validToken = token;

    const controller = new AbortController();
    let retryTimeout: number | undefined;
    const returningFromPayment =
      new URLSearchParams(window.location.search).get("payment") === "success";

    async function loadReport(attempt = 0): Promise<void> {
      try {
        const response = await fetch(`/api/reports/${encodeURIComponent(contractId)}`, {
          headers: { Authorization: `Bearer ${validToken}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as ReportResponse;
        if (!response.ok) {
          throw new Error(
            apiErrorMessage(body, "The report could not be opened."),
          );
        }
        setState({ status: "ready", data: body, token: validToken });

        if (returningFromPayment && !body.paid && attempt < 5) {
          retryTimeout = window.setTimeout(() => void loadReport(attempt + 1), 2_000);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "The report could not be opened.",
        });
      }
    }

    void loadReport();
    return () => {
      controller.abort();
      if (retryTimeout) window.clearTimeout(retryTimeout);
    };
  }, [contractId]);

  async function startCheckout(data: ReportResponse) {
    if (!data.checkout_token) return;
    setCheckoutPending(true);
    setCheckoutError(null);
    try {
      window.sessionStorage.setItem(`explain-my-contract:${contractId}`, state.status === "ready" ? state.token : "");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId, checkout_token: data.checkout_token }),
      });
      const body = (await response.json()) as {
        error?: string;
        request_id?: string;
        url?: string;
      };
      if (!response.ok || !body.url) {
        throw new Error(apiErrorMessage(body, "Checkout could not be opened."));
      }
      window.location.assign(body.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be opened.");
    } finally {
      setCheckoutPending(false);
    }
  }

  async function deleteReport(token: string) {
    const confirmed = window.confirm(
      "Permanently delete this report? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeletePending(true);
    try {
      const response = await fetch(
        `/api/reports/${encodeURIComponent(contractId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = (await response.json()) as {
        deleted?: boolean;
        error?: string;
        request_id?: string;
      };
      if (!response.ok || !body.deleted) {
        throw new Error(apiErrorMessage(body, "The report could not be deleted."));
      }

      window.sessionStorage.removeItem(`explain-my-contract:${contractId}`);
      window.history.replaceState(null, "", window.location.pathname);
      setState({ status: "deleted" });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The report could not be deleted.",
      });
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-canvas px-5 py-12 text-brand-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-brand-action" href="/">← Explain My Contract Now</Link>

        {state.status === "loading" ? (
          <p className="mt-12 rounded-2xl bg-white px-6 py-8">Opening your private report…</p>
        ) : state.status === "deleted" ? (
          <div className="mt-12 rounded-2xl border border-brand-border bg-white px-6 py-8">
            <h1 className="font-fraunces text-3xl font-semibold text-brand-indigo">
              Your unpaid report was deleted.
            </h1>
            <p className="mt-3 text-sm text-brand-ink">
              The report and its recovery link no longer work.
            </p>
          </div>
        ) : state.status === "error" ? (
          <div className="mt-12 rounded-2xl border border-red-200 bg-white px-6 py-8">
            <h1 className="font-fraunces text-3xl font-semibold text-brand-indigo">We couldn’t open this report.</h1>
            <p className="mt-3 text-sm text-red-900">{state.message}</p>
          </div>
        ) : (
          <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-brand-border bg-white shadow-xl shadow-brand-indigo/8">
            <header className="bg-brand-indigo px-6 py-8 text-white sm:px-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-canvas-deep">
                {state.data.paid
                  ? "Your full report"
                  : state.data.full_report_preview
                    ? "Local full report preview"
                    : "Your private report preview"}
              </p>
              <h1 className="mt-3 font-fraunces text-4xl font-semibold">
                {state.data.preview.agreement_snapshot.agreement_type}
              </h1>
              <p className="mt-3 text-sm text-brand-canvas">
                {state.data.preview.total_flags} {state.data.preview.total_flags === 1 ? "term" : "terms"} to review · {highAttentionCount} high attention
              </p>
              <p className="mt-2 text-xs text-brand-canvas">
                Available until {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(state.data.report_expires_at))}
              </p>
            </header>

            <div className="space-y-4 px-5 py-6 sm:px-7">
              {state.data.preview.agreement_snapshot ? (
                <section className="rounded-2xl border border-brand-border bg-brand-canvas px-5 py-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-action">The deal at a glance</p>
                  {state.data.preview.agreement_snapshot.reviewed_for ? (
                    <p className="mt-3 text-sm">
                      <strong>{state.data.intent === "considering_signing" ? "Prospective party reviewed:" : "Party reviewed:"}</strong>{" "}
                      {state.data.preview.agreement_snapshot.reviewed_for}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm">
                    <strong>{state.data.preview.agreement_snapshot.counterparty_label ?? "Named service provider"}:</strong>{" "}
                    {state.data.preview.agreement_snapshot.provider}
                  </p>
                  <p className="mt-2 text-sm"><strong>Term:</strong> {state.data.preview.agreement_snapshot.term}</p>
                  {[
                    ["What you get", state.data.preview.agreement_snapshot.what_you_get],
                    ["What you pay", state.data.preview.agreement_snapshot.what_you_pay],
                    ["What you commit to", state.data.preview.agreement_snapshot.what_you_commit_to],
                  ].map(([label, values]) => Array.isArray(values) && values.length ? (
                    <div className="mt-4" key={label as string}>
                      <h2 className="font-fraunces text-lg font-semibold text-brand-indigo">{label as string}</h2>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                        {values.map((value) => <li key={value}>{value}</li>)}
                      </ul>
                    </div>
                  ) : null)}
                </section>
              ) : null}

              {highAttentionCount > 0 ? (
                <aside className="rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-5 text-red-950" role="note">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-800">
                    Report-level attention
                  </p>
                  <h2 className="mt-2 font-fraunces text-2xl font-semibold">
                    High attention recommended
                  </h2>
                  <p className="mt-2 text-sm leading-6">
                    According to your contract, this agreement includes {highAttentionCount} {highAttentionCount === 1 ? "term" : "terms"} with significant financial or practical consequences. Review the original language carefully and consider a qualified attorney if you are deciding how to respond or proceed.
                  </p>
                </aside>
              ) : null}

              {highAttentionItems.map((item) => (
                <FindingCard item={item} key={`${item.location}-${item.headline}`} />
              ))}

              {state.data.report?.protections?.length ? (
                <section className="rounded-2xl border-2 border-teal-200 bg-teal-50 px-5 py-5 text-teal-950">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-800">
                    Protections in your contract
                  </p>
                  <div className="mt-4 space-y-4">
                    {state.data.report.protections.map((protection) => (
                      <article key={`${protection.location}-${protection.headline}`}>
                        <h2 className="font-fraunces text-xl font-semibold">{protection.headline}</h2>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-teal-800">{protection.location}</p>
                        <p className="mt-2 text-sm leading-6">{protection.explanation}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {remainingItems.map((item) => (
                <FindingCard item={item} key={`${item.location}-${item.headline}`} />
              ))}

              {!state.data.paid && !state.data.full_report_preview ? (
                <div className="rounded-2xl bg-brand-canvas-deep px-6 py-6">
                  <h2 className="font-fraunces text-2xl font-semibold text-brand-indigo">Unlock the complete explanation</h2>
                  <p className="mt-2 text-sm leading-6 text-brand-ink">
                    Payment unlocks the report already prepared for this contract. This private link remains your recovery key.
                  </p>
                  <p className="mt-3 text-sm font-bold text-brand-indigo">
                    Beta tester? Enter your 100%-off code and confirm the total is $0 before you complete checkout.
                  </p>
                  {checkoutError ? <p role="alert" className="mt-4 text-sm text-red-900">{checkoutError} Your snapshot is still available. You can try checkout again.</p> : null}
                  {state.data.checkout_enabled && state.data.checkout_token ? (
                    <button
                      className="mt-5 rounded-full bg-brand-action px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
                      disabled={checkoutPending}
                      type="button"
                      onClick={() => startCheckout(state.data)}
                    >
                      {checkoutPending ? "Opening secure checkout…" : "Unlock my full report"}
                    </button>
                  ) : (
                    <p className="mt-4 text-sm font-bold text-brand-muted">Secure checkout is not open yet.</p>
                  )}
                </div>
              ) : null}

              {state.data.payment_status === "unpaid" && !state.data.local_fixture ? (
                <div className="border-t border-brand-border pt-5">
                  <button
                    className="text-sm font-bold text-red-800 underline decoration-red-300 underline-offset-4 disabled:opacity-60"
                    disabled={deletePending}
                    type="button"
                    onClick={() => deleteReport(state.token)}
                  >
                    {deletePending
                      ? "Deleting unpaid report…"
                      : "Permanently delete this unpaid report"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
