"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AnalysisIntent } from "@/lib/analysis-intent";

type AnalysisItem = {
  headline: string;
  legal_gibberish: string;
  danger: string;
  fix: string;
  location: string;
};

type AnalysisReport = {
  agreement_snapshot: {
    agreement_type: string;
    provider: string;
    term: string;
  };
  total_flags: number;
  categories_found: string[];
  detailed_analysis: AnalysisItem[];
  informational_notice?: string;
};

type PreviewItem = Pick<AnalysisItem, "headline" | "location">;

function isAnalysisItem(item: AnalysisItem | PreviewItem): item is AnalysisItem {
  return "legal_gibberish" in item && "danger" in item && "fix" in item;
}

type ReportResponse = {
  error?: string;
  intent: AnalysisIntent;
  paid: boolean;
  payment_status: string;
  checkout_enabled: boolean;
  checkout_token?: string;
  preview: {
    agreement_snapshot: AnalysisReport["agreement_snapshot"];
    total_flags: number;
    categories_found: string[];
    flag_previews: PreviewItem[];
  };
  report?: AnalysisReport;
};

export default function ReportClient({ contractId }: { contractId: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: ReportResponse; token: string }
  >({ status: "loading" });
  const [checkoutPending, setCheckoutPending] = useState(false);

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
        if (!response.ok) throw new Error(body.error || "The report could not be opened.");
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
    try {
      window.sessionStorage.setItem(`explain-my-contract:${contractId}`, state.status === "ready" ? state.token : "");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId, checkout_token: data.checkout_token }),
      });
      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Checkout could not be opened.");
      window.location.assign(body.url);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Checkout could not be opened.",
      });
    } finally {
      setCheckoutPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-canvas px-5 py-12 text-brand-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-brand-action" href="/">← Explain My Contract</Link>

        {state.status === "loading" ? (
          <p className="mt-12 rounded-2xl bg-white px-6 py-8">Opening your private report…</p>
        ) : state.status === "error" ? (
          <div className="mt-12 rounded-2xl border border-red-200 bg-white px-6 py-8">
            <h1 className="font-fraunces text-3xl font-semibold text-brand-indigo">We couldn’t open this report.</h1>
            <p className="mt-3 text-sm text-red-900">{state.message}</p>
          </div>
        ) : (
          <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-brand-border bg-white shadow-xl shadow-brand-indigo/8">
            <header className="bg-brand-indigo px-6 py-8 text-white sm:px-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-canvas-deep">
                {state.data.paid ? "Your full report" : "Your private report preview"}
              </p>
              <h1 className="mt-3 font-fraunces text-4xl font-semibold">
                {state.data.preview.agreement_snapshot.agreement_type}
              </h1>
              <p className="mt-3 text-sm text-brand-canvas">
                {state.data.preview.total_flags} {state.data.preview.total_flags === 1 ? "flag" : "flags"} found
              </p>
            </header>

            <div className="space-y-4 px-5 py-6 sm:px-7">
              {(state.data.report?.detailed_analysis ?? state.data.preview.flag_previews).map((item) => (
                <article className="rounded-2xl border border-brand-border p-5" key={`${item.location}-${item.headline}`}>
                  <h2 className="font-fraunces text-xl font-semibold text-brand-indigo">{item.headline}</h2>
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
              ))}

              {!state.data.paid ? (
                <div className="rounded-2xl bg-brand-canvas-deep px-6 py-6">
                  <h2 className="font-fraunces text-2xl font-semibold text-brand-indigo">Unlock the complete explanation</h2>
                  <p className="mt-2 text-sm leading-6 text-brand-ink">
                    Payment unlocks the report already prepared for this contract. This private link remains your recovery key.
                  </p>
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
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
