"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";

import { apiErrorMessage } from "@/lib/api-error";
import { ANALYSIS_DISCLAIMER_TEXT } from "@/lib/analysis-disclaimer";
import type { AnalysisIntent } from "@/lib/analysis-intent";
import {
  CONTRACT_ROLE_OPTIONS,
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from "@/lib/contract-type";

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
  attention_level: "high_attention" | "important" | "document_quality";
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
  flag_previews: Array<Pick<AnalysisItem, "headline" | "attention_level" | "location">>;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const TURNSTILE_ALWAYS_PASS_SITE_KEY = "1x00000000000000000000AA";
const LOCAL_TURNSTILE_TEST_TOKEN = "local-development-turnstile-bypass";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const REVIEW_ONLY = process.env.NEXT_PUBLIC_REVIEW_ONLY === "true";

type ContractExample = {
  id: "brand" | "lease" | "coaching";
  tab: string;
  title: string;
  filename: string;
  effectiveDate: string;
  parties: string;
  clauses: Array<{ number: string; heading: string; text: string; kind?: string }>;
  translations: Array<{ original: string; plain: string }>;
  report: Array<{ label: string; value: string }>;
};

const CONTRACT_EXAMPLES: ContractExample[] = [
  {
    id: "brand", tab: "Brand Deal", title: "BRAND COLLABORATION AGREEMENT",
    filename: "brand-collaboration-agreement.pdf", effectiveDate: "Effective September 12, 2026",
    parties: 'Between “Brand” and “Creator”',
    clauses: [
      { number: "1.1", heading: "Deliverables", text: "Creator will publish three short-form videos and two story frames on the approved social channels.", kind: "restriction" },
      { number: "2.1", heading: "Compensation", text: "Brand will pay Creator $4,500 within thirty days after final publication and receipt of a correct invoice.", kind: "payment" },
      { number: "3.2", heading: "Approval", text: "Brand will provide consolidated content feedback within two business days of receiving each draft.", kind: "deadline" },
      { number: "4.1", heading: "Usage Rights", text: "Brand may use the approved content in paid social advertising for six months from first publication." },
      { number: "5.1", heading: "Exclusivity", text: "Creator will not promote a competing skincare brand for forty-five days after the final post.", kind: "restriction" },
      { number: "7.2", heading: "Cancellation", text: "If Brand cancels after production begins, Creator will receive fifty percent of the remaining fee.", kind: "exit" },
    ],
    translations: [
      { original: "within thirty days after final publication", plain: "Payment is due 30 days after the last post." },
      { original: "paid social advertising for six months", plain: "The brand can run the content as ads for 6 months." },
      { original: "fifty percent of the remaining fee", plain: "Cancellation after work starts pays 50% of the balance." },
    ],
    report: [
      { label: "Money", value: "$4,500, due 30 days after final publication" },
      { label: "Commitment", value: "Three videos, two story frames, and 45 days of exclusivity" },
      { label: "Important Dates", value: "Brand feedback is due within two business days" },
      { label: "Restrictions", value: "Paid usage lasts six months" },
      { label: "Exit", value: "50% of the remaining fee if the brand cancels after production starts" },
    ],
  },
  {
    id: "lease", tab: "Lease", title: "RESIDENTIAL LEASE AGREEMENT",
    filename: "residential-lease-agreement.pdf", effectiveDate: "Lease begins October 1, 2026",
    parties: 'Between “Landlord” and “Tenant”',
    clauses: [
      { number: "2.1", heading: "Term", text: "The lease begins October 1, 2026 and continues for twelve months through September 30, 2027.", kind: "deadline" },
      { number: "3.1", heading: "Rent and Deposit", text: "Tenant will pay monthly rent of $2,400 and a security deposit of $2,400 before receiving keys.", kind: "payment" },
      { number: "5.2", heading: "Maintenance", text: "Tenant will keep the interior clean and promptly report conditions requiring Landlord repair." },
      { number: "7.1", heading: "Use and Subletting", text: "The premises are for residential use only and may not be sublet without Landlord’s written consent.", kind: "restriction" },
      { number: "11.1", heading: "Default", text: "Tenant has ten days after written notice to cure a monetary default before termination remedies may begin.", kind: "exit" },
      { number: "14.2", heading: "Renewal Notice", text: "Tenant must give written notice at least sixty days before expiration to request a new term.", kind: "renewal" },
    ],
    translations: [
      { original: "$2,400 before receiving keys", plain: "First rent and a $2,400 deposit are due before move-in." },
      { original: "at least sixty days before expiration", plain: "Ask to renew in writing at least 60 days before the lease ends." },
      { original: "may not be sublet without written consent", plain: "You need the landlord’s written permission to sublet." },
    ],
    report: [
      { label: "Money", value: "$2,400 monthly rent plus a $2,400 security deposit" },
      { label: "Commitment", value: "A 12-month lease and interior upkeep" },
      { label: "Important Dates", value: "Renewal request is due 60 days before expiration" },
      { label: "Restrictions", value: "Residential use only; written consent required to sublet" },
      { label: "Exit", value: "A monetary default has a 10-day cure period after written notice" },
    ],
  },
  {
    id: "coaching", tab: "Coaching Agreement", title: "COACHING SERVICES AGREEMENT",
    filename: "coaching-services-agreement.pdf", effectiveDate: "Program begins October 5, 2026",
    parties: 'Between “Coach” and “Client”',
    clauses: [
      { number: "1.1", heading: "Program", text: "Coach will provide eight private sessions of sixty minutes each during the twelve-week program." },
      { number: "2.1", heading: "Program Fee", text: "Client will pay $3,200 in full or four monthly installments of $850.", kind: "payment" },
      { number: "3.3", heading: "Rescheduling", text: "Sessions may be rescheduled with at least twenty-four hours’ notice; missed sessions are forfeited.", kind: "deadline" },
      { number: "5.1", heading: "Client Responsibilities", text: "Client is responsible for completing agreed exercises and making independent business decisions.", kind: "restriction" },
      { number: "7.2", heading: "Cancellation and Refunds", text: "Fees are nonrefundable after the first session, except where required by law.", kind: "exit" },
      { number: "9.1", heading: "Scope and Results", text: "Coaching is educational and does not guarantee revenue, employment, financing, or any specific result." },
    ],
    translations: [
      { original: "four monthly installments of $850", plain: "The installment option totals $3,400." },
      { original: "missed sessions are forfeited", plain: "With less than 24 hours’ notice, you lose that session." },
      { original: "does not guarantee ... any specific result", plain: "The coach promises the service, not a particular business outcome." },
    ],
    report: [
      { label: "Money", value: "$3,200 in full or four $850 installments" },
      { label: "Commitment", value: "Eight 60-minute sessions across 12 weeks" },
      { label: "Important Dates", value: "Reschedule at least 24 hours before a session" },
      { label: "Restrictions", value: "Missed sessions are forfeited; client owns the decisions" },
      { label: "Exit", value: "Fees are nonrefundable after the first session" },
    ],
  },
];

type TurnstileWidgetId = string;
type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ) => TurnstileWidgetId;
  remove: (widgetId: TurnstileWidgetId) => void;
  reset: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile: TurnstileApi;
  }
}


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
              <p className="mb-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-brand-action">
                {item.attention_level === "high_attention"
                  ? "High attention"
                  : item.attention_level === "document_quality"
                    ? "Document-quality concern"
                    : "Important to understand"}
              </p>
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
            Save this link. It is the key to your full report. Do not share it.
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const heroCtaRef = useRef<HTMLAnchorElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<AnalysisIntent>("considering_signing");
  const [contractType, setContractType] = useState<ContractType | "">("");
  const [reviewPerspective, setReviewPerspective] = useState("");
  const [customPerspective, setCustomPerspective] = useState("");
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<ContractExample["id"]>("brand");
  const [demoRun, setDemoRun] = useState(0);
  const demoVisible = true;
  const [manualPaused, setManualPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageMotionPaused, setPageMotionPaused] = useState(false);
  const demoPaused = manualPaused || interactionPaused || pageMotionPaused;
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });
  const localTurnstileTestMode =
    process.env.NODE_ENV === "development" &&
    TURNSTILE_SITE_KEY === TURNSTILE_ALWAYS_PASS_SITE_KEY;
  const browserVerificationToken =
    turnstileToken || (localTurnstileTestMode ? LOCAL_TURNSTILE_TEST_TOKEN : "");

  useEffect(() => {
    if (
      !file ||
      !turnstileReady ||
      !TURNSTILE_SITE_KEY ||
      !turnstileContainerRef.current ||
      turnstileWidgetIdRef.current
    ) {
      return;
    }

    const widgetId = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        action: "analyze_contract",
        callback: setTurnstileToken,
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
      },
    );
    turnstileWidgetIdRef.current = widgetId;

    return () => {
      if (window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // The provider may already have discarded a detached test widget.
        }
      }
      if (turnstileWidgetIdRef.current === widgetId) {
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [file, submission.status, turnstileReady]);

  useEffect(() => {
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      revealTargets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "18% 0px 18%", threshold: 0.01 },
    );

    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReducedMotion(mediaQuery.matches);
    const pauseWhenHidden = () => setInteractionPaused(document.hidden);
    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      mediaQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (!demoVisible || demoPaused || reducedMotion) return;
    const timer = window.setTimeout(() => {
      const currentIndex = CONTRACT_EXAMPLES.findIndex((contract) => contract.id === selectedContractId);
      setSelectedContractId(CONTRACT_EXAMPLES[(currentIndex + 1) % CONTRACT_EXAMPLES.length].id);
      setDemoRun((value) => value + 1);
    }, 9500);
    return () => window.clearTimeout(timer);
  }, [demoPaused, demoRun, demoVisible, reducedMotion, selectedContractId]);

  useEffect(() => {
    if (!heroCtaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(heroCtaRef.current);
    return () => observer.disconnect();
  }, []);

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
    setContractType("");
    setReviewPerspective("");
    setCustomPerspective("");
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
    setContractType("");
    setReviewPerspective("");
    setCustomPerspective("");
    setTurnstileToken("");
    setSubmission({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function processDocument(intent: AnalysisIntent) {
    if (!file) return;

    const submittedTurnstileToken = browserVerificationToken;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("intent", intent);
    formData.set("contract_type", contractType);
    formData.set(
      "review_perspective",
      reviewPerspective === "Other"
        ? customPerspective.trim()
        : reviewPerspective,
    );
    formData.set(
      "disclaimer_acknowledged",
      disclaimerAcknowledged ? "true" : "false",
    );
    formData.set("turnstile_token", submittedTurnstileToken);

    setTurnstileToken("");
    setSubmission({ status: "submitting", intent });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        request_id?: string;
        contract_id?: string;
        recovery_token?: string;
        intent?: AnalysisIntent;
        tease?: AnalysisPreview;
      };

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(result, "The contract could not be analyzed."),
        );
      }

      if (
        !result.contract_id ||
        !result.recovery_token ||
        !result.intent ||
        !result.tease
      ) {
        throw new Error("The analysis response was incomplete. Try again.");
      }

      const reportUrl = `/report/${result.contract_id}#token=${encodeURIComponent(result.recovery_token)}`;

      setSubmission({
        status: "success",
        contractId: result.contract_id,
        recoveryToken: result.recovery_token,
        intent: result.intent,
        result: result.tease,
      });
      router.push(reportUrl);
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
  const isAlreadySigned = selectedIntent === "already_signed";
  const finalPerspective = reviewPerspective === "Other"
    ? customPerspective.trim()
    : reviewPerspective;
  const roleOptions = contractType ? CONTRACT_ROLE_OPTIONS[contractType] : [];
  const selectedContract = CONTRACT_EXAMPLES.find((contract) => contract.id === selectedContractId) ?? CONTRACT_EXAMPLES[0];

  return (
    <div className={`site-shell experience min-h-[100dvh] bg-brand-white text-brand-ink ${pageMotionPaused ? "motion-paused" : ""}`}>
      {!REVIEW_ONLY ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setTurnstileReady(true)}
        />
      ) : null}
      {REVIEW_ONLY ? (
        <div className="review-banner" role="status">
          Review-only preview · Contract uploads and analysis are disabled
        </div>
      ) : null}
      <header className="site-header mx-auto flex w-full max-w-[1240px] items-center justify-between px-5">
        <a
          className="brand-lockup flex items-center text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action"
          href="#top"
        >
          <Image
            alt="Tami Stewart Consults"
            className="brand-mark"
            height={124}
            priority
            src="/brand/tami-stewart-consults-logo.svg"
            width={288}
          />
        </a>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#faq">Common Questions</a>
          <a className="meet-tami" href="https://tamistewartconsults.com">Meet Tami</a>
          <a className="header-cta" href="#upload">Explain My Contract Now</a>
        </nav>
      </header>

      <main id="top">
        <button className="motion-toggle" type="button" aria-pressed={pageMotionPaused} onClick={() => setPageMotionPaused(!pageMotionPaused)}>{pageMotionPaused ? "Play page motion" : "Pause page motion"}</button>
        <section className="hero mx-auto grid w-full max-w-[1240px] px-5 lg:grid-cols-[52fr_48fr] lg:items-center">
          <div className="hero-copy">
            <div className="hero-message" key={selectedIntent}>
              <h1 className="font-fraunces font-semibold text-brand-indigo">
                <span className="headline-line">Explain My</span>{" "}<span className="headline-line headline-accent">Contract Now</span>
              </h1>
              <div className="intent-selector" aria-label="Choose your signing status" role="group">
                <button aria-pressed={!isAlreadySigned} className={!isAlreadySigned ? "is-selected" : ""} onClick={() => setSelectedIntent("considering_signing")} type="button">
                  I haven’t signed yet
                </button>
                <button aria-pressed={isAlreadySigned} className={isAlreadySigned ? "is-selected" : ""} onClick={() => setSelectedIntent("already_signed")} type="button">
                  I already signed
                </button>
              </div>
              {!isAlreadySigned ? (
                <>
                  <p className="hero-subhead">Understand the contract. Know what it means for you.</p>
                  <p>Upload your contract and get a plain-English snapshot of what you’re agreeing to, including payments, obligations, deadlines, restrictions, renewal terms, and exit provisions.</p>
                </>
              ) : (
                <>
                  <p>Upload the contract and see what you agreed to, which rights and obligations it describes, and which deadlines, payments, restrictions, renewal terms, and exit provisions may still affect you.</p>
                  <p>Get clear on what the contract says and what deserves your attention.</p>
                </>
              )}
            </div>
            <div className="hero-action">
              <a className="primary-cta" href="#upload" ref={heroCtaRef}>
                Explain My Contract Now <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="trust-line">Private report link. Automatically expires. Educational, not legal advice.</p>
          </div>

          <div
            className={`contract-demo theme-${selectedContract.id} ${demoPaused ? "is-paused" : ""} ${reducedMotion ? "is-reduced" : ""}`}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false); }}
            onFocus={() => setInteractionPaused(true)}
            onMouseEnter={() => setInteractionPaused(true)}
            onMouseLeave={() => setInteractionPaused(false)}
            ref={demoRef}
          >
            <p className="demo-example-label">Three examples—not the limit</p>
            <div className="contract-tabs" aria-label="Explore three fictional contract examples" role="tablist">
              {CONTRACT_EXAMPLES.map((contract) => (
                <button
                  aria-selected={contract.id === selectedContractId}
                  className={contract.id === selectedContractId ? "is-selected" : ""}
                  key={contract.id}
                  onClick={() => { setSelectedContractId(contract.id); setManualPaused(false); setDemoRun((value) => value + 1); }}
                  role="tab"
                  type="button"
                >
                  {contract.tab}
                </button>
              ))}
            </div>
            <div className="demo-toolbar">
              <span>Fictional composite example · many other contract types welcome</span>
              <div>
                <button aria-label={manualPaused ? "Play contract demonstration" : "Pause contract demonstration"} onClick={() => setManualPaused((value) => !value)} type="button">{manualPaused ? "Play" : "Pause"}</button>
                <button onClick={() => { setManualPaused(false); setDemoRun((value) => value + 1); }} type="button">Replay</button>
              </div>
            </div>
            <div className={`transformation-stage ${demoVisible ? "is-playing" : ""}`} key={`${selectedContract.id}-${demoRun}`}>
              <article className="contract-document">
                <div className="document-meta"><span>{selectedContract.filename}</span><span>Page 1 of 1</span></div>
                <h2>{selectedContract.title}</h2>
                <p className="effective-date">{selectedContract.effectiveDate}</p>
                <p className="party-line">{selectedContract.parties}</p>
                <div className="contract-clauses">
                  {selectedContract.clauses.map((clause) => (
                    <section className={clause.kind ? `term-${clause.kind}` : ""} key={clause.number}>
                      <h3>{clause.number} {clause.heading}</h3>
                      <p>{clause.text}</p>
                    </section>
                  ))}
                </div>
                <div className="signature-row"><span>Client / Customer / Tenant</span><span>Provider / Company / Landlord</span></div>
              </article>
              <div className="phrase-transform">
                <span>Original language → Plain English</span>
                {selectedContract.translations.map((translation) => (
                  <div className="translation-row" key={translation.original}>
                    <p>{translation.original}</p><strong>{translation.plain}</strong>
                  </div>
                ))}
              </div>
              <article className="snapshot-report">
                <header>
                  <span>{isAlreadySigned ? "Terms to track now" : "Questions before you sign"}</span>
                  <h2>Your Contract Snapshot</h2>
                  <p>{selectedContract.title}</p>
                </header>
                <div className="snapshot-grid">
                  {selectedContract.report.map((item) => <section key={item.label}><span>{item.label}</span><p>{item.value}</p></section>)}
                </div>
                <div className="snapshot-ready"><span aria-hidden="true">✓</span> Snapshot ready</div>
              </article>
              <div className="scan-line" aria-hidden="true" />
            </div>
            <p className="demo-note">Watch contract language become a structured, plain-English snapshot.</p>
          </div>
        </section>

        <section className="terms-ribbon" aria-label="What your report helps you understand">
          <div className="terms-track" aria-hidden="true">{[0, 1].map(copy => <div className="terms-run" key={copy}><span>Your money</span><i>→</i><span>Your time</span><i>→</i><span>Your obligations</span><i>→</i><span>Your next questions</span><i>→</i></div>)}</div>
          <p className="sr-only">Your money. Your time. Your obligations. Your next questions.</p>
        </section>
        <section className="attention-section section-shell" data-reveal>
          <div className="attention-copy">
            <span className="section-eyebrow">01 / Read between the lines</span><h2>Know what deserves <em>your attention.</em></h2>
            <p>Contracts can bury important terms inside pages of legal language.</p>
            <p>Your report helps you quickly see what affects your money, responsibilities, timing, flexibility, and options.</p>
            <p className="attention-close">So you can sign with a clearer picture of what you’re agreeing to, not wondering what you missed.</p>
            <a className="text-cta" href="#upload">Explain My Contract Now <span aria-hidden="true">→</span></a>
          </div>
          <div className="attention-list">
            <article><span>Money</span><p>Payments, fees, and what the other party provides.</p></article>
            <article><span>Responsibilities</span><p>Your obligations, approvals, access, and restrictions.</p></article>
            <article><span>Timing</span><p>Deadlines, notice periods, and renewal dates.</p></article>
            <article><span>Flexibility and exit</span><p>Cancellation, termination, and terms that need clarification.</p></article>
          </div>
        </section>

        <section className="why-section" data-reveal>
          <div className="why-statement">
            <h2>Contract analysis should start with one question: <em>What does this mean for you?</em></h2>
            <p>Explain My Contract Now looks at the agreement from your side, in your situation, without turning every clause into a scare tactic.</p>
          </div>
          <div className="why-reasons" aria-label="Why choose Explain My Contract Now">
            <article>
              <strong>Your side of the agreement</strong>
              <p>Tell us whether you are the tenant, employee, client, provider, landlord, or another named party. The report is written from that perspective.</p>
            </article>
            <article>
              <strong>Before or after you sign</strong>
              <p>Preparing to sign and understanding something you already signed are different problems. The analysis changes with your situation.</p>
            </article>
            <article>
              <strong>Risks and protections</strong>
              <p>See what deserves attention, along with the terms that protect you or give you useful options.</p>
            </article>
            <article>
              <strong>One report, no subscription</strong>
              <p>Pay for the contract you need help understanding. Your original PDF is not retained, and your private report automatically expires.</p>
            </article>
          </div>
        </section>

        <section className="contract-breadth section-shell" data-reveal>
          <div className="contract-breadth-lead">
            <span className="section-eyebrow">Many contracts. One starting question.</span>
            <h2>Your contract does not need to fit one of the examples.</h2>
            <p>Explain My Contract Now reviews many everyday personal and business agreements from the side you are—or would be—on.</p>
          </div>
          <div className="contract-breadth-list" aria-label="Examples of supported contract categories">
            <span>Rental and lease</span>
            <span>Employment and contractor</span>
            <span>Client and service</span>
            <span>Brand and sponsorship</span>
            <span>Vendor and purchase</span>
            <span>NDA and confidentiality</span>
            <span>Coaching, membership, and subscription</span>
            <span>Insurance policy</span>
          </div>
          <p className="contract-breadth-note"><strong>Don’t see yours?</strong> Upload it anyway. Choose “Another kind of contract” and tell us which side you’re on.</p>
        </section>

        <section className="sample-section section-shell" data-reveal>
          <div className="section-heading">
            <span>Illustrative sample based on a fictional service agreement</span>
            <h2>See what your report can surface</h2>
          </div>
          <div className="sample-report">
            <div className="sample-summary">
              <span className="sample-label">Document</span><h3>Marketing Services Agreement</h3>
              <dl>
                <div><dt>What you pay</dt><dd>$2,500 setup fee plus $1,200 per month</dd></div>
                <div><dt>Initial commitment</dt><dd>12 months</dd></div>
                <div><dt>Renewal</dt><dd>Another 12 months unless written notice is provided at least 60 days before renewal</dd></div>
                <div><dt>Cancellation</dt><dd>No general early-cancellation right is described during the initial term</dd></div>
                <div><dt>Your responsibilities</dt><dd>Provide account access, approvals, and creative materials within five business days</dd></div>
              </dl>
            </div>
            <aside className="sample-attention">
              <span className="sample-label">Deserves attention</span>
              <h3>Questions to consider</h3>
              <ul>
                <li>What is the exact renewal date?</li>
                <li>Where must cancellation notice be sent?</li>
                <li>Is early termination available by mutual agreement?</li>
                <li>Does promotional-use language cover confidential materials?</li>
                <li>Are deliverables and revision limits fully defined?</li>
              </ul>
              <p>This sample identifies language and practical questions. It does not determine whether terms are enforceable or tell someone what decision to make.</p>
            </aside>
          </div>
        </section>

        <section className="upload-zone section-shell" id="upload">
          <div className="upload-heading" data-reveal>
            <h2>Explain My Contract Now</h2>
            <p>{REVIEW_ONLY ? "This public preview is for reviewing the experience. Contract uploads are intentionally disabled." : `${isAlreadySigned ? "Upload the contract you already signed." : "Upload the contract you are considering signing."} PDF only, 10 MB maximum.`}</p>
            {!REVIEW_ONLY ? <p className="upload-breadth">Your contract does not need to fit a category. Choose “Another kind of contract” if you do not see an exact match.</p> : null}
          </div>

        <div
          data-reveal
          className={`upload-panel w-full overflow-hidden transition-[border-color,background-color,box-shadow] duration-200 ${
            submission.status === "success"
              ? "border-solid border-brand-border bg-brand-canvas p-0"
              : `p-6 sm:p-10 ${
                  isDragging
                    ? "is-dragging border-brand-action bg-brand-canvas-deep"
                    : "border-brand-border bg-brand-canvas"
                }`
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!REVIEW_ONLY) setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={REVIEW_ONLY ? (event) => event.preventDefault() : handleDrop}
        >
          {REVIEW_ONLY ? (
            <div className="review-only-panel">
              <span>Review mode</span>
              <h3>The product workflow is intentionally offline here.</h3>
              <p>Review the design, messaging, fictional contract demonstrations, responsive behavior, and educational boundary without submitting a real contract.</p>
            </div>
          ) : !file ? (
            <div className="upload-empty grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="upload-title">Drop your contract here</p>
                <p className="mt-2 text-sm leading-6 text-brand-muted sm:text-base">
                  PDF only, 10 MB maximum. Scans and photos are not supported yet.
                </p>
              </div>
              <label className="file-button cursor-pointer bg-brand-action px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-indigo focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-brand-action">
                Choose PDF
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : isSubmitting ? (
            <div aria-live="polite" className="flex flex-col items-center py-7">
              <div className="mb-5 size-9 animate-spin rounded-full border-4 border-brand-border border-t-brand-action motion-reduce:animate-none" />
              <h2 className="font-fraunces text-2xl font-semibold text-brand-indigo">
                Reading your contract
              </h2>
              <p className="mt-2 text-sm text-brand-muted">
                Most reports are ready in about a minute. If the analysis
                service is busy, we will automatically try another supported
                model, so it may take a little longer. Keep this page open; you
                will not be charged if the analysis fails.
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
                Pick your level of “what the hell?”
              </h2>
              <p className="mt-2 text-sm text-brand-muted">
                Your answer changes what the analysis looks for.
              </p>

              <label className="mt-6 w-full text-left text-sm font-bold text-brand-indigo">
                1. What kind of contract is this?
                <span className="mt-2 block text-xs font-normal leading-5 text-brand-muted">
                  This changes the checklist used to review your document.
                </span>
                <select
                  className="mt-3 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-action focus:ring-2 focus:ring-brand-action/20"
                  value={contractType}
                  onChange={(event) => {
                    setContractType(event.currentTarget.value as ContractType | "");
                    setReviewPerspective("");
                    setCustomPerspective("");
                  }}
                >
                  <option value="">Choose a contract type</option>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="mt-6 w-full text-left text-sm font-bold text-brand-indigo">
                2. Which side are you—or would you be—on?
                <span className="mt-2 block text-xs font-normal leading-5 text-brand-muted">
                  Choose the role whose money, responsibilities, deadlines, and options should be prioritized.
                </span>
                <select
                  className="mt-3 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-action focus:ring-2 focus:ring-brand-action/20 disabled:bg-brand-canvas-deep"
                  disabled={!contractType}
                  value={reviewPerspective}
                  onChange={(event) => {
                    setReviewPerspective(event.currentTarget.value);
                    if (event.currentTarget.value !== "Other") setCustomPerspective("");
                  }}
                >
                  <option value="">Choose your side</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>

              {reviewPerspective === "Other" ? (
                <label className="mt-4 w-full text-left text-sm font-bold text-brand-indigo">
                  Name the role shown in the contract
                  <input
                    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-action focus:ring-2 focus:ring-brand-action/20"
                    maxLength={120}
                    placeholder="For example: Guarantor or Additional insured"
                    type="text"
                    value={customPerspective}
                    onChange={(event) => setCustomPerspective(event.currentTarget.value)}
                  />
                </label>
              ) : null}

              {contractType === "insurance_policy" ? (
                <p className="mt-4 w-full rounded-xl border border-brand-border bg-brand-canvas-deep px-4 py-3 text-left text-xs leading-5 text-brand-ink">
                  Insurance review is in early beta. The report can organize limits, deductibles, exclusions, endorsements, and notice duties, but it cannot confirm whether a particular claim is covered.
                </p>
              ) : null}

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

              <div className="mt-5 min-h-[65px]" ref={turnstileContainerRef} />
              {localTurnstileTestMode ? (
                <p className="mt-2 text-xs font-semibold text-brand-action">
                  Local test verification is ready.
                </p>
              ) : null}
              {!TURNSTILE_SITE_KEY ? (
                <p className="mt-2 text-xs font-semibold text-red-800" role="alert">
                  Browser verification is not configured.
                </p>
              ) : null}

              <div className="mt-7 grid w-full gap-4 sm:grid-cols-2">
                <button
                  className="rounded-2xl border-2 border-brand-action bg-white px-5 py-5 text-left font-bold text-brand-action transition hover:bg-brand-canvas-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:border-brand-border disabled:text-brand-muted disabled:opacity-60"
                  disabled={!contractType || !finalPerspective || !disclaimerAcknowledged || !browserVerificationToken}
                  type="button"
                  onClick={() => processDocument("considering_signing")}
                >
                  What the hell am I signing?
                  <span className="mt-2 block text-sm font-normal leading-5 text-brand-ink">
                    Show me the red flags before I put my name on it.
                  </span>
                </button>
                <button
                  className="rounded-2xl border-2 border-brand-action bg-brand-action px-5 py-5 text-left font-bold text-white shadow-lg shadow-brand-action/15 transition hover:border-brand-indigo hover:bg-brand-indigo focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-muted disabled:opacity-60"
                  disabled={!contractType || !finalPerspective || !disclaimerAcknowledged || !browserVerificationToken}
                  type="button"
                  onClick={() => processDocument("already_signed")}
                >
                  What the hell did I sign?
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

        </section>

        <section className="how-section section-shell" data-reveal id="how-it-works">
          <div className="section-heading"><span className="section-eyebrow">03 / From PDF to perspective</span><h2>Less head-scratching.<br /><em>More understanding.</em></h2></div>
          <ol>
            <li><span>01</span><div><h3>Upload your contract</h3><p>Choose the contract you want to understand.</p></div></li>
            <li><span>02</span><div><h3>Get a plain-English report</h3><p>See the provisions that may affect your money, obligations, deadlines, flexibility, and options.</p></div></li>
            <li><span>03</span><div><h3>Decide what deserves a closer look</h3><p>Identify questions, track important terms, research anything unclear, or prepare for a more informed conversation with an attorney.</p></div></li>
          </ol>
        </section>

        <section className="truth-section section-shell" data-reveal>
          <div><span className="section-eyebrow">A clear boundary</span><h2>Built for understanding, <em>not legal advice.</em></h2></div>
          <div><p>This tool is designed to help you understand what a contract says.</p><p>It does not tell you whether you should sign, determine your legal rights, predict how a provision would be enforced, or replace advice from a qualified attorney.</p><p>For important decisions, verify key terms in the original contract and consult an attorney when appropriate.</p></div>
        </section>

        <section className="handling-section section-shell" data-reveal>
          <div className="handling-lead"><h2>How your contract is handled</h2><p>Clear language about what happens to your information.</p></div>
          <div className="handling-copy">
            <p><strong>Your original PDF is not retained.</strong></p>
            <p>Text extracted from the contract is sent to Google Gemini for analysis. If Gemini is unavailable, it may be sent to OpenAI as a backup. The resulting report is temporarily stored in Supabase and automatically expires.</p>
            <p>Your report is accessed through a private link. Anyone who has that link can access it, so do not share it with anyone you do not want to see it.</p>
          </div>
        </section>

        <section className="final-section" data-reveal>
          <div className="section-shell"><h2>Before you sign, or after you already did</h2><p>You don’t need to become a lawyer. You need to know what you’re agreeing to, what may affect you, and what deserves another look.</p><a className="final-cta" href="#upload">Explain My Contract Now <span aria-hidden="true">→</span></a><small>Plain English. Private report link. Automatically expires. Educational, not legal advice.</small></div>
        </section>

        <section className="faq-section section-shell" data-reveal id="faq">
          <div className="section-heading"><h2>Frequently asked questions</h2></div>
          <div className="faq-list">
            <details><summary>Is this legal advice?</summary><p>No. The report is educational and designed to help you understand the language and structure of your contract. It is not a substitute for advice from a qualified attorney.</p></details>
            <details><summary>Will it tell me whether I should sign?</summary><p>No. It helps you understand the terms, obligations, deadlines, restrictions, and other provisions so you can decide what questions you want answered.</p></details>
            <details><summary>Can I use it if I already signed?</summary><p>Yes. The report can help you understand what the contract says, identify obligations or deadlines that may still matter, and spot terms to research or discuss with an attorney.</p></details>
            <details><summary>Is my contract stored?</summary><p>The original PDF is not retained. Extracted contract text is sent to Google Gemini for analysis and may be sent to OpenAI if Gemini is unavailable. The resulting report is temporarily stored in Supabase before it automatically expires.</p></details>
            <details><summary>Who can see my report?</summary><p>The report is available through a private link. Anyone with that link can access it, so do not share it with anyone you do not want to see the report.</p></details>
            <details><summary>Can the report be wrong?</summary><p>AI-generated analysis can miss context or misunderstand contract language. For important decisions, verify key terms against the original contract and consult an attorney when appropriate.</p></details>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="meet-tami">
        <div className="section-shell footer-grid">
          <div className="footer-brand">
            <Image alt="Tami Stewart Consults" height={124} loading="eager" src="/brand/tami-stewart-consults-logo.svg" width={288} />
            <p>Understand the contract. Know what it means for you.</p>
          </div>
          <nav aria-label="Footer navigation"><a href="#how-it-works">How It Works</a><a href="#faq">Common Questions</a><a href="/privacy">Privacy &amp; support</a><a href="https://tamistewartconsults.com">Meet Tami</a></nav>
          <div className="footer-action"><a className="header-cta" href="#upload">Explain My Contract Now</a></div>
        </div>
        <div className="section-shell footer-bottom"><p>Educational—not legal advice.</p></div>
      </footer>

      {showStickyCta && !file ? <a className="mobile-sticky-cta" href="#upload">Explain My Contract Now</a> : null}
    </div>
  );
}
