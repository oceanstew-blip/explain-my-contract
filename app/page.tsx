"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import Image from "next/image";

import { ANALYSIS_DISCLAIMER_TEXT } from "@/lib/analysis-disclaimer";
import type { AnalysisIntent } from "@/lib/analysis-intent";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting"; intent: AnalysisIntent }
  | { status: "error"; message: string }
  | {
      status: "success";
      intent: AnalysisIntent;
      contractId: string;
      recoveryToken: string;
      result: AnalysisPreview;
    };

type AnalysisItem = {
  headline: string;
  legal_gibberish: string;
  danger: string;
  fix: string;
  location: string;
};

type AnalysisResult = {
  agreement_snapshot: {
    agreement_type: string;
    provider: string;
    term: string;
    what_you_get: string[];
    what_you_pay: string[];
    what_you_commit_to: string[];
  };
  total_flags: number;
  categories_found: string[];
  detailed_analysis: AnalysisItem[];
  informational_notice?: string;
};

type AnalysisPreview = Omit<AnalysisResult, "detailed_analysis"> & {
  flag_previews: Array<Pick<AnalysisItem, "headline" | "location">>;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;


function PreviewPanel({
  intent,
  result,
  reportUrl,
  onReset,
}: {
  intent: AnalysisIntent;
  result: AnalysisPreview;
  reportUrl: string;
  onReset: () => void;
}) {
  const isAlreadySigned = intent === "already_signed";

  return (
    <section aria-live="polite" className="text-left">
      <div className="border-b border-brand-border bg-white px-6 py-7 sm:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-bright">
          Your free contract snapshot
        </p>
        <h2 className="mt-3 font-fraunces text-3xl font-semibold text-brand-indigo sm:text-4xl">
          {result.total_flags === 0
            ? "No matching flags surfaced in this scan."
            : `${result.total_flags} ${result.total_flags === 1 ? "clause deserves" : "clauses deserve"} a closer look.`}
        </h2>
        <p className="mt-3 text-sm leading-6 text-brand-muted sm:text-base">
          The full report explains what each clause says, what it means for you,
          and {isAlreadySigned ? "what the contract still allows" : "what you may want to question before signing"}.
        </p>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-7">
        <div className="rounded-2xl border border-brand-border bg-white px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-bright">
            The deal in plain English
          </p>
          <h3 className="mt-2 font-fraunces text-2xl font-semibold text-brand-indigo">
            {result.agreement_snapshot.agreement_type}
          </h3>
          <p className="mt-2 text-sm leading-6 text-brand-ink">
            Provided by {result.agreement_snapshot.provider} · {result.agreement_snapshot.term}
          </p>
        </div>

        {result.flag_previews.map((item) => (
          <div
            className="flex items-center justify-between gap-5 rounded-2xl border border-brand-border bg-white px-5 py-4"
            key={`${item.location}-${item.headline}`}
          >
            <div>
              <p className="font-fraunces text-lg font-semibold text-brand-indigo">
                {item.headline}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
                {item.location}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-canvas px-3 py-1.5 text-xs font-bold text-brand-action">
              In full report
            </span>
          </div>
        ))}

        <div className="rounded-2xl bg-brand-indigo px-6 py-6 text-white">
          <h3 className="font-fraunces text-2xl font-semibold">
            Your private report link is ready.
          </h3>
          <p className="mt-2 text-sm leading-6 text-brand-canvas">
            Save this link. It is the key to this report and will show the full
            analysis after payment. Do not share it.
          </p>
          <a
            className="mt-5 inline-flex rounded-full bg-brand-action px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-brand-indigo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            href={reportUrl}
          >
            Open and save my report
          </a>
        </div>

        <div className="flex justify-center">
          <button
            className="text-sm font-bold text-brand-action underline underline-offset-4"
            type="button"
            onClick={onReset}
          >
            Analyze another PDF
          </button>
        </div>
      </div>
    </section>
  );
}

function validatePdf(selectedFile: File): string | null {
  if (
    selectedFile.type !== "application/pdf" &&
    !selectedFile.name.toLowerCase().endsWith(".pdf")
  ) {
    return "Choose a PDF document.";
  }
  if (selectedFile.size === 0) {
    return "This PDF is empty. Choose a different document.";
  }
  if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
    return "Choose a PDF that is 10 MB or smaller.";
  }
  return null;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile) return;
    const validationError = validatePdf(selectedFile);

    if (validationError) {
      setFile(null);
      setSubmission({ status: "error", message: validationError });
      return;
    }

    setFile(selectedFile);
    setDisclaimerAcknowledged(false);
    setSubmission({ status: "idle" });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.currentTarget.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function resetFile() {
    setFile(null);
    setDisclaimerAcknowledged(false);
    setSubmission({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function processDocument(intent: AnalysisIntent) {
    if (!file) return;
    setSubmission({ status: "submitting", intent });

    const formData = new FormData();
    formData.set("file", file);
    formData.set("intent", intent);
    formData.set(
      "disclaimer_acknowledged",
      disclaimerAcknowledged ? "true" : "false",
    );

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        contract_id?: string;
        recovery_token?: string;
        intent?: AnalysisIntent;
        tease?: AnalysisPreview;
      };

      if (!response.ok) {
        throw new Error(result.error || "The contract could not be analyzed.");
      }

      if (
        !result.contract_id ||
        !result.recovery_token ||
        !result.intent ||
        !result.tease
      ) {
        throw new Error("The analysis response was incomplete. Try again.");
      }

      setSubmission({
        status: "success",
        contractId: result.contract_id,
        recoveryToken: result.recovery_token,
        intent: result.intent,
        result: result.tease,
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The contract could not be analyzed. Try again.",
      });
    }
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <div className="min-h-screen bg-brand-white text-brand-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a
          className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action"
          href="#top"
        >
          <Image
            alt="Tami Stewart Consults"
            className="size-24 shrink-0 sm:size-28"
            height={112}
            priority
            src="/brand/tami-stewart-consults-logo.svg"
            width={112}
          />
          <span>
            <span className="block font-fraunces text-lg font-bold tracking-tight text-brand-indigo sm:text-xl">
              Explain My Contract
            </span>
            <span className="mt-0.5 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-muted">
              A Tami Stewart Consults tool
            </span>
          </span>
        </a>
        <a
          className="text-sm font-semibold text-brand-bright transition-colors hover:text-brand-action focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action"
          href="#upload"
        >
          How it works
        </a>
      </header>

      <main
        className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-10 text-center sm:px-8 sm:pt-16"
        id="top"
      >
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-brand-bright">
          Legal language without the legal-language headache.
        </p>
        <h1 className="max-w-3xl font-fraunces text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-brand-indigo sm:text-6xl md:text-7xl">
          Your contract, translated into actual human.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-brand-ink sm:text-xl sm:leading-8">
          Upload the PDF, tell us where you are in the process, and get a clear
          first pass at the clauses that deserve your attention.
        </p>

        <div
          className={`mt-11 w-full overflow-hidden rounded-[1.75rem] border-2 transition-[border-color,background-color,box-shadow] duration-200 ${
            submission.status === "success"
              ? "max-w-4xl border-solid border-brand-border bg-brand-canvas p-0 shadow-xl shadow-brand-indigo/8"
              : `max-w-2xl p-6 sm:p-12 ${
                  isDragging
                    ? "border-brand-action bg-brand-canvas-deep shadow-xl shadow-brand-action/10"
                    : "border-dashed border-brand-border bg-brand-canvas"
                }`
          }`}
          id="upload"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="flex flex-col items-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-brand-border bg-white shadow-sm">
                <svg
                  aria-hidden="true"
                  className="size-8 text-brand-action"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 0 1 15.9 6H16a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h2 className="font-fraunces text-2xl font-semibold text-brand-indigo sm:text-3xl">
                Upload your contract
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-muted sm:text-base">
                Drag and drop your PDF here, or choose it from your device.
              </p>

              <label className="mt-6 cursor-pointer rounded-full bg-brand-action px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-action/20 transition hover:bg-brand-indigo focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-brand-action">
                Select PDF document
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                />
              </label>
              <p className="mt-4 text-xs text-brand-muted">PDF only · 10 MB maximum</p>
              <p className="mt-2 max-w-md text-xs leading-5 text-brand-muted">
                Upload a digital, text-based PDF. Scanned documents and photos
                are not currently supported.
              </p>
            </div>
          ) : isSubmitting ? (
            <div aria-live="polite" className="flex flex-col items-center py-7">
              <div className="mb-5 size-9 animate-spin rounded-full border-4 border-brand-border border-t-brand-action motion-reduce:animate-none" />
              <h2 className="font-fraunces text-2xl font-semibold text-brand-indigo">
                Reading your contract
              </h2>
              <p className="mt-2 text-sm text-brand-muted">
                Explain My Contract is scanning the document now.
              </p>
            </div>
          ) : submission.status === "success" ? (
            <PreviewPanel
              intent={submission.intent}
              result={submission.result}
              reportUrl={`/report/${submission.contractId}#token=${encodeURIComponent(submission.recoveryToken)}`}
              onReset={resetFile}
            />
          ) : (
            <div className="flex flex-col items-center">
              <p className="max-w-full truncate text-xs font-bold uppercase tracking-[0.14em] text-brand-bright">
                {file.name}
              </p>
              <h2 className="mt-3 font-fraunces text-2xl font-semibold text-brand-indigo sm:text-3xl">
                Pick your level of “what the heck?”
              </h2>
              <p className="mt-2 text-sm text-brand-muted">
                Your answer changes what the analysis looks for.
              </p>

              <label className="mt-6 flex w-full items-start gap-3 rounded-2xl border border-brand-border bg-white px-4 py-4 text-left text-sm leading-6 text-brand-ink">
                <input
                  checked={disclaimerAcknowledged}
                  className="mt-1 size-4 shrink-0 accent-brand-action"
                  type="checkbox"
                  onChange={(event) =>
                    setDisclaimerAcknowledged(event.currentTarget.checked)
                  }
                />
                <span>{ANALYSIS_DISCLAIMER_TEXT}</span>
              </label>

              <div className="mt-7 grid w-full gap-4 sm:grid-cols-2">
                <button
                  className="rounded-2xl border-2 border-brand-action bg-white px-5 py-5 text-left font-bold text-brand-action transition hover:bg-brand-canvas-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:border-brand-border disabled:text-brand-muted disabled:opacity-60"
                  disabled={!disclaimerAcknowledged}
                  type="button"
                  onClick={() => processDocument("considering_signing")}
                >
                  What the heck am I signing?
                  <span className="mt-2 block text-sm font-normal leading-5 text-brand-ink">
                    Show me the red flags before I put my name on it.
                  </span>
                </button>
                <button
                  className="rounded-2xl border-2 border-brand-action bg-brand-action px-5 py-5 text-left font-bold text-white shadow-lg shadow-brand-action/15 transition hover:border-brand-indigo hover:bg-brand-indigo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-muted disabled:opacity-60"
                  disabled={!disclaimerAcknowledged}
                  type="button"
                  onClick={() => processDocument("already_signed")}
                >
                  What the heck did I just sign?
                  <span className="mt-2 block text-sm font-normal leading-5 text-brand-canvas">
                    Calmly explain the exits, deadlines, limits, and rules.
                  </span>
                </button>
              </div>

              <button
                className="mt-6 text-xs font-semibold text-brand-muted underline underline-offset-4 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action"
                type="button"
                onClick={resetFile}
              >
                Choose a different PDF
              </button>
            </div>
          )}
        </div>

        {submission.status === "error" ? (
          <div
            className="mt-5 w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-left text-sm font-medium text-red-900"
            role="alert"
          >
            {submission.message}
          </div>
        ) : null}

        <p className="mt-7 max-w-xl text-xs leading-5 text-brand-muted">
          Explain My Contract provides informational contract analysis, not
          legal advice. A qualified attorney can advise you about your specific
          situation.
        </p>
      </main>
    </div>
  );
}
