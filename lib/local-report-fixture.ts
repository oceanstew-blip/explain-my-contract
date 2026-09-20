import { createAnalysisPreview, type AnalysisResult } from "./analysis-config";

export const TEST_07_CONTRACT_ID = "07000000-0000-4000-8000-000000000007";
export const TEST_07_RECOVERY_TOKEN = "local-test-07-private-preview";

const report: AnalysisResult = {
  agreement_snapshot: {
    reviewed_for: "Morgan Vale Studio LLC, named as Agency",
    agreement_type: "Marketing Campaign Services Agreement",
    provider: "Morgan Vale Studio LLC",
    counterparty_label: "Named service provider",
    term: "Work ends on final delivery; Sections 4-6 continue after completion or cancellation.",
    what_you_get: ["One landing page and ten digital advertisements."],
    what_you_pay: ["A fixed $4,000 fee: half on acceptance and half on delivery."],
    what_you_commit_to: [
      "Obtain written approval before additional expenses.",
      "Carry the defense, indemnity, and settlement obligations described in Sections 4-6.",
    ],
  },
  total_flags: 6,
  categories_found: ["Indemnity", "Payment", "Client materials", "Cancellation", "Document quality"],
  protections: [
    {
      headline: "Fixed project price",
      explanation: "The contract sets the total fee at $4,000 and states that there is no percentage-of-spend fee.",
      location: "Section 2",
    },
    {
      headline: "Written approval for extra expenses",
      explanation: "The Agency must obtain written approval before incurring any additional expense, preventing extra costs from being added informally.",
      location: "Section 2",
    },
    {
      headline: "Client approval and permissions",
      explanation: "The Client approves factual claims and represents that it has permission to use supplied materials. This protection is weakened by Section 4, which still places related third-party claims on the Agency.",
      location: "Sections 1 and 3",
    },
    {
      headline: "Cancellation charges are capped",
      explanation: "Completed work is billed at $100 per hour on cancellation, but the charge cannot exceed $4,000 and prior payments must be credited.",
      location: "Section 7",
    },
    {
      headline: "Changes require both parties' written acceptance",
      explanation: "The agreement states that changes require a writing accepted by both parties.",
      location: "Section 8",
    },
  ],
  detailed_analysis: [
    {
      headline: "Uncapped responsibility for claims the Client may cause",
      attention_level: "high_attention",
      legal_gibberish: "The contract states that the Agency must defend and reimburse the Client for campaign-related third-party claims, including claims based on the Client's materials, instructions, or negligence.",
      danger: "According to Sections 4-6, the Client controls the defense and may settle at the Agency's expense, while these costs have no stated monetary cap and continue after the project ends.",
      fix: "Before signing, request that each party cover claims caused by its own materials, instructions, breach, or negligence; require Agency consent to settlement; and place the obligation under an agreed cap.",
      location: "Sections 4-6",
    },
    {
      headline: "Payment depends on undefined milestones",
      attention_level: "important",
      legal_gibberish: "The contract divides the $4,000 fee between acceptance and delivery but does not define either milestone or state an invoice deadline.",
      danger: "The parties may disagree about when each payment is earned or due, especially if Client feedback delays delivery.",
      fix: "Before signing, define acceptance, final delivery, invoice due dates, and the effect of delayed Client materials or approval.",
      location: "Section 2",
    },
    {
      headline: "Client-supplied content creates a mismatch in responsibility",
      attention_level: "important",
      legal_gibberish: "The Client supplies and approves product claims, images, and testimonials, but the Agency's indemnity also covers claims arising from those materials.",
      danger: "The Agency could carry the financial consequence of content the Client selected, approved, or lacked permission to use.",
      fix: "Keep written approvals and substantiation, and revise the indemnity so the Client remains responsible for the content and permissions it supplies.",
      location: "Sections 1, 3 and 4",
    },
    {
      headline: "Cancellation calculation lacks a procedure",
      attention_level: "important",
      legal_gibberish: "The contract states how completed work is priced after cancellation but does not say who may cancel, how notice must be sent, or when cancellation takes effect.",
      danger: "The payment amount is bounded, but an unclear process could create disagreement about the end date and completed hours.",
      fix: "Add who may cancel, an accepted written-notice method, the effective date, and a record of completed hours before signing.",
      location: "Section 7",
    },
    {
      headline: "Project ownership and delivery rules are not defined",
      attention_level: "document_quality",
      legal_gibberish: "The agreement does not define acceptance, delivery, revisions, ownership, a delivery schedule, or final-file and account handoff.",
      danger: "The document leaves central project production and handoff mechanics unresolved rather than assigning a clear process.",
      fix: "Add a written scope-and-delivery schedule covering ownership, revisions, approval deadlines, final files, and account access.",
      location: "Sections 1 and 2",
    },
    {
      headline: "Notice and dispute location are not specified",
      attention_level: "document_quality",
      legal_gibberish: "The agreement provides no formal notice method and expressly designates no jurisdiction, governing law, venue, or dispute process.",
      danger: "The document does not identify where notices go or the agreed process and location for handling a dispute.",
      fix: "Before signing, add notice addresses and delivery methods, then identify the agreed governing law, venue, and dispute process.",
      location: "Sections 7 and 8",
    },
  ],
};

export function createTest07LocalDelivery() {
  return {
    contract_id: TEST_07_CONTRACT_ID,
    intent: "considering_signing" as const,
    payment_status: "unpaid",
    paid: false,
    preview: createAnalysisPreview(report),
    report,
    full_report_preview: true,
    checkout_enabled: false,
    report_expires_at: "2026-10-20T16:00:00.000Z",
    local_fixture: true,
  };
}

export const RESIDENTIAL_LEASE_CONTRACT_ID = "08000000-0000-4000-8000-000000000008";
export const RESIDENTIAL_LEASE_RECOVERY_TOKEN = "local-residential-lease-private-preview";

const residentialLeaseReport: AnalysisResult = {
  agreement_snapshot: {
    reviewed_for: "Alice Appleseed, named as Tenant",
    agreement_type: "Residential Lease Agreement",
    provider: "Bob Barker",
    counterparty_label: "Named landlord",
    term: "One year, from October 1, 2026 through September 30, 2027; it does not automatically renew.",
    what_you_get: [
      "Use of a two-bedroom, one-bathroom apartment in Anytown, New York.",
      "Appliances and fixtures attached to or installed in the apartment.",
      "Structural, roof, and exterior-wall maintenance by the Landlord, plus timely repair of reported issues.",
    ],
    what_you_pay: [
      "$1,200 monthly rent, due in advance on the first day of each month.",
      "A $1,200 security deposit that cannot be used as the last month's rent.",
      "Utility charges under Section 8, although Section 2 separately says the premises include all utilities.",
      "$50 per day if rent is not received by the fifth day of the month.",
    ],
    what_you_commit_to: [
      "Use the apartment only as a residence for the Tenant and authorized immediate family.",
      "Get prior written consent for subletting, assignment, animals, alterations, painting, or decorating.",
      "Keep the apartment clean, promptly report needed repairs, and cover damage caused by the Tenant, guests, or animals.",
      "Provide written notice and follow the stated move-out requirements when ending the lease.",
    ],
  },
  total_flags: 7,
  categories_found: [
    "Late fees",
    "Attorney fees",
    "Utilities",
    "Liability",
    "Early termination",
    "Rules",
    "Document quality",
  ],
  protections: [
    {
      headline: "Entry generally requires 24 hours' notice",
      explanation: "The Landlord must give at least 24 hours' notice before entering, except in an emergency.",
      location: "Section 11",
    },
    {
      headline: "Written notice and a chance to cure",
      explanation: "Before pursuing remedies for nonpayment or another violation, the Landlord must provide written notice and a reasonable opportunity to cure as required by law.",
      location: "Section 13.A",
    },
    {
      headline: "Normal wear and tear is excluded",
      explanation: "The security-deposit and move-out clauses distinguish ordinary wear and tear from tenant-caused damage.",
      location: "Sections 4.C and 14.B",
    },
    {
      headline: "No automatic renewal",
      explanation: "The lease ends after the stated one-year term unless the parties enter a new lease; it does not roll into another fixed term automatically.",
      location: "Section 16",
    },
    {
      headline: "Renter's insurance is recommended, not required",
      explanation: "The lease places responsibility for personal-property insurance on the Tenant but expressly says the coverage is not required by the Landlord.",
      location: "Section 12.A-B",
    },
    {
      headline: "Changes must be written and signed",
      explanation: "The agreement says modifications are effective only when both the Landlord and Tenant sign them in writing.",
      location: "Section 17",
    },
  ],
  detailed_analysis: [
    {
      headline: "$50-per-day late charge can escalate quickly",
      attention_level: "high_attention",
      legal_gibberish: "If rent is not received by the fifth day of the month, the lease assesses a $50 charge for every day it remains late.",
      danger: "According to the contract, ten assessed days would add $500 and twenty days would add $1,000. The clause states no maximum charge.",
      fix: "Before signing, request a one-time late fee or a clearly stated cap, and have the revised lease identify the first assessment date and the maximum total charge for one missed payment.",
      location: "Section 3.D",
    },
    {
      headline: "Landlord claims attorney's fees without a matching tenant right",
      attention_level: "high_attention",
      legal_gibberish: "If the Tenant breaches the lease, the Landlord may seek attorney's fees and court costs in addition to other remedies.",
      danger: "The document creates potentially significant added expense for the Tenant but does not state a matching contractual right for the Tenant when the Landlord breaches.",
      fix: "Before signing, request mutual language limited to reasonable fees awarded by a court, or remove the fee-shifting sentence from Section 13.B.",
      location: "Section 13.B",
    },
    {
      headline: "The lease contradicts itself about utilities",
      attention_level: "important",
      legal_gibberish: "Section 2 says the premises include all utilities, while Section 8 says the Tenant must pay water, sewer, gas, electricity, telephone, and any other utilities except common-area utilities.",
      danger: "The monthly housing cost cannot be determined from the document because both provisions cannot describe the same payment arrangement.",
      fix: "Before signing, obtain one written utility list naming every service included in the $1,200 rent, every service the Tenant must open and pay, and which clause controls; update Sections 2 and 8 to match.",
      location: "Sections 2 and 8",
    },
    {
      headline: "Personal-property disclaimer is very broad",
      attention_level: "important",
      legal_gibberish: "The Landlord disclaims responsibility for damage to the Tenant's personal property regardless of cause, except as required by law.",
      danger: "The contract places ordinary personal-property loss on the Tenant and does not explain what events remain the Landlord's responsibility beyond the legal exception.",
      fix: "Before signing, ask the Landlord to clarify in writing how losses caused by building conditions, maintenance failures, or the Landlord's conduct are handled, then compare that answer with the renter's-insurance coverage you would purchase.",
      location: "Section 12.B-C",
    },
    {
      headline: "Early termination adds undefined re-renting costs",
      attention_level: "important",
      legal_gibberish: "The Tenant may give 30 days' written notice to end early, but must pay rent through the termination date and any costs the Landlord incurs in re-renting.",
      danger: "The notice period is clear, but the extra re-renting costs have no definition, documentation requirement, or stated limit.",
      fix: "Before signing, ask for a list of allowable re-renting expenses, a receipt requirement, a dollar cap, and confirmation that no charge continues after the stated termination date except documented re-renting costs.",
      location: "Section 15",
    },
    {
      headline: "Future building rules are not attached or limited",
      attention_level: "important",
      legal_gibberish: "The Tenant must follow all building and community rules established by the Landlord or management, but the lease does not attach those rules or describe how new rules may be added.",
      danger: "The Tenant cannot review the full set of promised restrictions before signing, and the clause does not state that later rules must be reasonable or delivered in writing.",
      fix: "Before signing, request the current rules as an attached exhibit and require future rules to be reasonable, written, delivered to the Tenant, and not inconsistent with the lease.",
      location: "Section 10.A",
    },
    {
      headline: "The condition acknowledgment is written as already completed",
      attention_level: "document_quality",
      legal_gibberish: "The unsigned lease says the Tenant has inspected the apartment and acknowledges that it is in good condition and repair.",
      danger: "If Alice has not actually inspected the apartment, signing would make the document state that an inspection and condition acknowledgment already occurred.",
      fix: "Do not sign this acknowledgment until after a walkthrough; attach a dated move-in condition checklist with photos and list every existing defect that should be excluded from Tenant responsibility.",
      location: "Section 6.A",
    },
  ],
};

export function createResidentialLeaseLocalDelivery() {
  return {
    contract_id: RESIDENTIAL_LEASE_CONTRACT_ID,
    intent: "considering_signing" as const,
    payment_status: "unpaid",
    paid: false,
    preview: createAnalysisPreview(residentialLeaseReport),
    report: residentialLeaseReport,
    full_report_preview: true,
    checkout_enabled: false,
    report_expires_at: "2026-10-20T16:00:00.000Z",
    local_fixture: true,
  };
}

export const COACHING_AGREEMENT_CONTRACT_ID = "09000000-0000-4000-8000-000000000009";
export const COACHING_AGREEMENT_RECOVERY_TOKEN = "local-coaching-agreement-private-preview";

const coachingAgreementReport: AnalysisResult = {
  agreement_snapshot: {
    reviewed_for: "Sam Student, named as Client",
    agreement_type: "Coaching Agreement",
    provider: "Kelly Coaching LLC and Kelly",
    counterparty_label: "Named coach",
    term: "A three-month program beginning October 1, 2026, with termination by either party on two weeks' written notice.",
    what_you_get: [
      "Six 60-minute internet coaching meetings over three months.",
      "Email responses within 48 hours and voicemail responses within 24 hours between scheduled meetings.",
      "Coaching focused on goals and outcomes that the agreement says will appear in an attached Schedule A, but no Schedule A appears in this PDF.",
    ],
    what_you_pay: [
      "$900 total, either due in full when the agreement is signed or split into three monthly payments of $300.",
      "$50 per hour for additional work requested by the Client outside coaching hours.",
      "A missed meeting may be billed if the Client gives less than 48 hours' notice.",
    ],
    what_you_commit_to: [
      "Initiate scheduled calls, communicate honestly, remain open to feedback, and make time to participate fully.",
      "Take responsibility for personal decisions, actions, well-being, and results rather than treating coaching as therapy or professional medical, mental-health, or legal advice.",
      "Provide two weeks' written notice to terminate and pay for services rendered through the termination date.",
      "Accept the agreement's confidentiality exceptions and record-retention terms.",
    ],
  },
  total_flags: 7,
  categories_found: [
    "Scope",
    "Privacy",
    "Record retention",
    "Refunds",
    "Liability",
    "Attorney fees",
    "Document quality",
  ],
  protections: [
    {
      headline: "The program length and meeting count are stated",
      explanation: "The agreement identifies a three-month program with two 60-minute meetings per month, providing a concrete baseline of six meetings.",
      location: "Sections 2 and 3",
    },
    {
      headline: "Unused sessions may qualify for refunds",
      explanation: "The Client may request a refund of unused coaching fees for sessions cancelled at least 48 hours in advance.",
      location: "Section 3",
    },
    {
      headline: "Either party has an exit path",
      explanation: "The Client or Coach may terminate with two weeks' written notice, and the payment language says the Client pays for services rendered through the termination date.",
      location: "Sections 1.C and 9",
    },
    {
      headline: "Named response windows between meetings",
      explanation: "The agreement says the Coach is available by email within 48 hours and voicemail within 24 hours between scheduled meetings.",
      location: "Section 2",
    },
    {
      headline: "Client information generally requires written consent",
      explanation: "Outside the listed exceptions, the Coach agrees not to disclose Client information or use the Client's name as a reference without consent.",
      location: "Section 5",
    },
    {
      headline: "Changes require both parties' signatures",
      explanation: "The agreement says amendments must be written and signed by both the Coach and Client.",
      location: "Section 11",
    },
    {
      headline: "Mediation comes before legal action",
      explanation: "The parties agree to attempt good-faith mediation for up to 30 days after notice before moving to legal action.",
      location: "Section 12",
    },
  ],
  detailed_analysis: [
    {
      headline: "The promised coaching goals are in a missing Schedule A",
      attention_level: "high_attention",
      legal_gibberish: "The opening paragraph says the coaching will focus on topics, results, outcomes, and goals attached as Schedule A, but this five-page PDF contains no Schedule A.",
      danger: "The Client could commit to paying up to $900 without the document stating the specific goals, subject matter, milestones, or expected coaching focus.",
      fix: "Before signing or paying, attach a Schedule A that lists the coaching goals, the focus of each phase, any materials or deliverables, how progress will be reviewed, and the date and signatures tying that schedule to this agreement.",
      location: "Opening paragraph and missing Schedule A",
    },
    {
      headline: "Client records may be retained for at least seven years",
      attention_level: "important",
      legal_gibberish: "The Coach may keep documents, information, and data from the relationship in print or digital form for no less than seven years.",
      danger: "The clause sets a long minimum retention period but provides no maximum, deletion date, security standard, storage location, access rule, or process for requesting a copy or correction.",
      fix: "Before signing, request a written privacy schedule stating what is retained, why it is needed, where and how it is secured, who may access it, the exact deletion date, and how the Client can request access, correction, or earlier deletion where permitted.",
      location: "Section 8",
    },
    {
      headline: "Information sharing extends beyond one-to-one coaching",
      attention_level: "important",
      legal_gibberish: "The form authorizes sharing the Client's name, contact details, and coaching dates for ICF credential verification, and says topics may be shared anonymously and hypothetically with other coaching professionals.",
      danger: "The credentialing authorization is pre-marked 'Client Agrees,' while the professional-development sharing has no separate choice or stated limits on audience, frequency, or de-identification method.",
      fix: "Before signing, make the ICF choice yourself rather than accepting the pre-marked selection, and request a separate opt-in for professional-development sharing that defines what may be shared, with whom, and how identifying details will be removed.",
      location: "Section 6",
    },
    {
      headline: "Termination and refund mechanics do not fully connect",
      attention_level: "important",
      legal_gibberish: "The Client may discontinue coaching, either party may terminate on two weeks' written notice, and unused sessions cancelled at least 48 hours ahead may be refunded.",
      danger: "The agreement does not say how a prepaid-program refund is calculated after termination, when it must be paid, whether monthly payments stop, or whether the 48-hour session rule also governs termination refunds.",
      fix: "Before signing, add a termination-refund formula covering prepaid unused sessions, the final payment date, when future installments stop, the refund deadline, and an accepted address or email for written notice.",
      location: "Sections 1.C, 3, 7 and 9",
    },
    {
      headline: "The Coach broadly disclaims responsibility and caps recovery",
      attention_level: "important",
      legal_gibberish: "The agreement disclaims responsibility for the Client's actions, inaction, and direct or indirect results; excludes indirect, consequential, and special damages; and caps the Coach's total liability at the amount the Client paid through termination.",
      danger: "If the Client believes the Coach's conduct caused loss, the contract sharply limits both the kinds of loss covered and the maximum contractual recovery, which may be no more than the coaching fees paid.",
      fix: "Before signing, ask for the cap and exclusions not to apply to the Coach's fraud, willful misconduct, confidentiality breach, or unauthorized disclosure of Client information, and have any agreed exceptions written into Section 10.",
      location: "Sections 1.B and 10",
    },
    {
      headline: "Legal action can shift attorney's fees to the losing party",
      attention_level: "important",
      legal_gibberish: "After the mediation period, the prevailing party in legal action may recover attorney's fees and court costs from the other party.",
      danger: "The clause is mutual, but it can substantially increase the financial stakes of a dispute beyond the $900 coaching price.",
      fix: "Before signing, decide whether to request that each party bear its own fees, or limit fee recovery to reasonable amounts awarded by a court after the required mediation process.",
      location: "Section 12",
    },
    {
      headline: "The agreement omits key notice and dispute details",
      attention_level: "document_quality",
      legal_gibberish: "The document requires written termination notice and mediation after notice, but does not identify an accepted notice method, notice email, mediation provider, mediation location, or court venue.",
      danger: "Colorado law is named, but the operational steps for delivering notice and starting or locating a dispute process are left unresolved.",
      fix: "Before signing, add the notice email and mailing address, when notice becomes effective, the mediation provider and location or remote process, and the agreed court venue if mediation fails.",
      location: "Sections 9, 12 and 15",
    },
  ],
};

export function createCoachingAgreementLocalDelivery() {
  return {
    contract_id: COACHING_AGREEMENT_CONTRACT_ID,
    intent: "considering_signing" as const,
    payment_status: "unpaid",
    paid: false,
    preview: createAnalysisPreview(coachingAgreementReport),
    report: coachingAgreementReport,
    full_report_preview: true,
    checkout_enabled: false,
    report_expires_at: "2026-10-20T16:00:00.000Z",
    local_fixture: true,
  };
}

export const EMPLOYEE_CONTRACT_ID = "10000000-0000-4000-8000-000000000010";
export const EMPLOYEE_CONTRACT_RECOVERY_TOKEN = "local-employee-contract-private-preview";

const employeeContractReport: AnalysisResult = {
  agreement_snapshot: {
    reviewed_for: "Prospective employee; no employee is named",
    agreement_type: "Incomplete fixed-term employment contract template",
    provider: "No employer is named",
    counterparty_label: "Proposed employer",
    term: "Not specified: the duration, start date, and end date remain blank or marked 'XXX.'",
    what_you_get: [
      "A proposed full-time employee relationship under a template from the VCCI Employers' Guidebook dated April 30, 2014.",
      "Overtime premiums, paid annual leave, paid sick leave, maternity leave, and termination payments described by reference to Vanuatu law.",
      "A job and attached duty description that have not been completed or included.",
    ],
    what_you_pay: [
      "No employee fee is stated, but the contract permits deductions and repayment obligations for advances and authorized property loss or damage.",
      "The hourly wage, attendance bonus, pay frequency, payment day, payment method, and payment location are all blank.",
    ],
    what_you_commit_to: [
      "Work regular hours that have not been filled in, plus up to four hours of employer-required overtime per week on one day's notice.",
      "Remain at assigned job sites, follow lawful orders, provide prompt sickness notice, and request annual leave at least two weeks ahead.",
      "Repay wage advances and authorized amounts for willful or negligent damage or loss, subject to the stated one-third wage limit.",
    ],
  },
  total_flags: 7,
  categories_found: [
    "Missing terms",
    "Termination",
    "Misconduct",
    "Leave",
    "Medical examination",
    "Deductions",
    "Document quality",
  ],
  protections: [
    {
      headline: "Overtime premiums are stated",
      explanation: "Overtime beyond regular hours is usually paid at 1.5 times the normal hourly wage, increasing to 1.75 times for overtime between 20:00 and 04:00.",
      location: "Clause 8",
    },
    {
      headline: "Extra overtime requires agreement",
      explanation: "The employer may require up to four overtime hours per week on one day's notice, but overtime beyond four hours requires agreement by both parties.",
      location: "Clauses 5-6",
    },
    {
      headline: "Property-damage deductions have safeguards",
      explanation: "Deductions for willful or negligent property loss require prior authorization by a labour officer and cannot exceed one-third of the employee's regular wage.",
      location: "Clause 14",
    },
    {
      headline: "Paid annual and sick leave are described",
      explanation: "The template provides 1.25 paid annual-leave days per month worked and up to 21 paid sick-leave days per year, subject to its notice and certificate conditions.",
      location: "Clauses 15-16",
    },
    {
      headline: "Employee can answer misconduct charges",
      explanation: "Before serious-misconduct termination, the employer promises an adequate opportunity for the employee to answer the charges and says explanations will be considered.",
      location: "Clause 22",
    },
    {
      headline: "Termination payments are acknowledged",
      explanation: "The template says severance allowance and unused annual leave will be paid in accordance with the Employment Act.",
      location: "Clauses 24-25",
    },
  ],
  detailed_analysis: [
    {
      headline: "Essential employment terms have not been completed",
      attention_level: "high_attention",
      legal_gibberish: "The template leaves blank the employer, employee, job title, contract dates, regular hours, lunch breaks, hourly wage, attendance bonus, pay frequency, payment day, payment method, and payment location; it also says the duty description is attached, but no attachment appears in this PDF.",
      danger: "A prospective employee cannot determine the job, compensation, schedule, duration, or payment process from this document, even though those terms define the employment bargain.",
      fix: "Do not sign this version. Require a clean contract that fills every blank, replaces 'XXX,' attaches the complete duty description, identifies both parties, and is initialed or signed only after the employee has reviewed the final completed copy.",
      location: "Opening and Clauses 1-4, 7, 9-10",
    },
    {
      headline: "More than one unexplained absence day can be treated as resignation",
      attention_level: "high_attention",
      legal_gibberish: "If the employee is absent for more than one day without contacting the employer, the template says the employee will be deemed to have resigned and the employment relationship will end.",
      danger: "The clause can characterize an absence as the employee's resignation rather than an employer termination, and the contract does not state exceptions for an emergency or inability to communicate.",
      fix: "Before signing, request a defined notice-and-investigation process, reasonable emergency exceptions, specific contact methods, and written confirmation that resignation will not be inferred until the employee has had a genuine opportunity to respond.",
      location: "Clauses 20 and 23",
    },
    {
      headline: "The serious-misconduct standard includes a vague reputation rule",
      attention_level: "important",
      legal_gibberish: "The listed grounds for immediate termination include 'any behaviour that brings the employer into disrepute.'",
      danger: "Unlike the more concrete examples, this phrase does not define the conduct, connection to work, evidence, or level of harm that could trigger immediate termination.",
      fix: "Before signing, ask for this ground to be limited to defined, serious work-related conduct that causes demonstrable harm, with written allegations and the Clause 22 response process preserved.",
      location: "Clauses 21-22",
    },
    {
      headline: "The employer ultimately controls annual-leave timing",
      attention_level: "important",
      legal_gibberish: "The employee must request leave two weeks ahead, but the employer fixes when annual leave will be taken and only agrees to follow the employee's request where practicable.",
      danger: "The amount of leave is stated, but the document gives the employee no firm approval deadline, objective refusal reasons, carryover process, or protection for already approved leave.",
      fix: "Before signing, add a written leave-request process with an employer response deadline, permitted refusal reasons, rules for changing approved leave, and treatment of unused leave during and at the end of employment.",
      location: "Clause 15",
    },
    {
      headline: "Medical examinations may be required at any time",
      attention_level: "important",
      legal_gibberish: "The employer may require the employee to be examined by a medical practitioner at the employer's expense at any point.",
      danger: "The clause does not identify a work-related reason, who selects the practitioner, what information may be disclosed, or how medical information will be protected.",
      fix: "Before signing, require examinations to be reasonably connected to fitness for the job, conducted by an agreed qualified practitioner, and limited to a fitness-for-work result with confidential medical details protected.",
      location: "Clause 17",
    },
    {
      headline: "Property-loss repayment is broader than the payroll-deduction safeguard",
      attention_level: "important",
      legal_gibberish: "The employee must reimburse the employer for willful or negligent loss or damage, and authorized amounts must be settled at termination; payroll deductions require labour-officer authorization and are capped at one-third of regular wages.",
      danger: "The deduction safeguards are helpful, but the document does not define how total loss is valued, how fault is established, how disputes are handled, or whether the employee's overall repayment obligation is capped.",
      fix: "Before signing, add a written investigation and valuation process, proof of actual loss, an opportunity to dispute fault or amount, and a clear limit on total employee responsibility as well as each deduction.",
      location: "Clauses 14 and 27",
    },
    {
      headline: "This is an old Vanuatu employer template, not a finished contract",
      attention_level: "document_quality",
      legal_gibberish: "The pages are labeled 'VCCI Employers' Guidebook,' dated April 30, 2014, cite the Vanuatu National Provident Fund and Employment Act, and begin with instructions warning employers to review the clauses before using them.",
      danger: "The document does not state a governing-law or dispute clause, identify the work location, or confirm that the 2014 statutory references and percentages remain current for the proposed employment.",
      fix: "Before using this template, identify the actual work location and governing law, remove employer drafting notes, verify every statutory reference and rate with a qualified local employment professional, and issue a current finalized contract.",
      location: "Employer note, footer, and Clauses 13, 18, 24-25",
    },
  ],
};

export function createEmployeeContractLocalDelivery() {
  return {
    contract_id: EMPLOYEE_CONTRACT_ID,
    intent: "considering_signing" as const,
    payment_status: "unpaid",
    paid: false,
    preview: createAnalysisPreview(employeeContractReport),
    report: employeeContractReport,
    full_report_preview: true,
    checkout_enabled: false,
    report_expires_at: "2026-10-20T16:00:00.000Z",
    local_fixture: true,
  };
}

export const COMMERCIAL_LEASE_CONTRACT_ID = "11000000-0000-4000-8000-000000000011";
export const COMMERCIAL_LEASE_RECOVERY_TOKEN = "local-commercial-lease-private-preview";

const commercialLeaseReport: AnalysisResult = {
  agreement_snapshot: {
    reviewed_for: "Prospective commercial tenant; no tenant is named",
    agreement_type: "Incomplete California commercial lease sample",
    provider: "No lessor is named",
    counterparty_label: "Proposed lessor",
    term: "Not specified: the term, commencement date, termination date, and renewal details are blank.",
    what_you_get: [
      "A proposed lease of commercial real property in California, but the city, address, premises, and permitted business use are blank.",
      "A possible renewal option, possession protections, casualty rent abatement, and limited termination rights, subject to incomplete terms.",
      "Use of the premises subject to extensive tenant maintenance, insurance, indemnity, tax, common-area, and subordination obligations.",
    ],
    what_you_pay: [
      "Base rent and the security deposit are blank.",
      "The Tenant pays all utilities, insurance, increases in property taxes, and a pro-rata share of common-area maintenance, taxes, and insurance.",
      "After default and termination, the Lessor may seek unpaid earned rent, certain future rent for the balance of the term, and other amounts caused by the default.",
    ],
    what_you_commit_to: [
      "Use the property only for the permitted commercial purpose, which has not been filled in.",
      "Maintain broad portions of the premises and adjacent areas, obtain consent for alterations and transfers, and comply with present and future requirements affecting the Tenant's use.",
      "Maintain liability and plate-glass insurance at coverage levels that have not been completed and name the Lessor as an additional insured.",
      "Indemnify the Lessor for many claims arising on the property, subject to a narrow exception.",
    ],
  },
  total_flags: 9,
  categories_found: [
    "Missing terms",
    "Indemnity",
    "Default remedies",
    "Operating expenses",
    "Maintenance",
    "Possession",
    "Casualty",
    "Subordination",
    "Document quality",
  ],
  protections: [
    {
      headline: "Assignment consent cannot be unreasonably withheld",
      explanation: "The Tenant needs written consent to assign or sublet, but the lease says the Lessor may not unreasonably withhold that consent.",
      location: "Paragraph 8",
    },
    {
      headline: "Rent does not begin before possession",
      explanation: "If the Lessor cannot deliver possession at commencement, the Tenant owes no rent until possession is delivered and may terminate after 120 days.",
      location: "Paragraph 11",
    },
    {
      headline: "Casualty can reduce rent",
      explanation: "During covered partial-destruction repairs, rent is reduced proportionately based on interference with the Tenant's business.",
      location: "Paragraph 15",
    },
    {
      headline: "Default generally includes notice and a cure period",
      explanation: "The lease provides a 15-day default-and-cure period when no other number is inserted, with additional time where cure begins promptly and proceeds diligently and in good faith.",
      location: "Paragraph 16",
    },
    {
      headline: "Eminent-domain rent is apportioned",
      explanation: "If a qualifying taking terminates the lease, rent is apportioned through termination, prepaid rent beyond that date is returned, and the Tenant may claim for its own fixtures, improvements, and moving expenses.",
      location: "Paragraph 14",
    },
    {
      headline: "Changes must be written and signed",
      explanation: "The lease says modifications require a writing signed by both parties.",
      location: "Paragraph 26",
    },
  ],
  detailed_analysis: [
    {
      headline: "The lease is missing the essential business deal",
      attention_level: "high_attention",
      legal_gibberish: "The sample leaves blank the parties, property address, city, term, dates, rent, renewal period and rent, renewal notice period, permitted use, insurance limits, security deposit, exhibits, signature date, and signer information.",
      danger: "The Tenant cannot determine the premises, duration, price, permitted business activity, insurance requirement, deposit, or renewal economics from this version.",
      fix: "Do not sign this sample. Require a clean final lease with every blank completed, all referenced exhibits attached, the repair checkbox affirmatively selected or deleted, and both parties reviewing and initialing the final negotiated version before signature.",
      location: "Opening, Paragraphs 1-3, 5, 13, 17 and 26, signature page",
    },
    {
      headline: "The Tenant's indemnity is broad and has no stated cap",
      attention_level: "high_attention",
      legal_gibberish: "The Lessor disclaims liability for injury or property damage on the premises, and the Tenant must indemnify the Lessor for claims 'no matter how caused' unless caused by the Lessor's sole negligence or sole unlawful conduct.",
      danger: "If both parties allegedly contributed to a claim, the narrow 'sole' exception may leave the Tenant carrying defense and loss exposure without a monetary cap, defense-control procedure, or settlement-consent rule.",
      fix: "Before signing, limit each party's indemnity to third-party claims caused by that party's negligence, willful misconduct, or breach; add notice, defense control, settlement consent, insurance coordination, and an agreed liability allocation or cap.",
      location: "Paragraph 12",
    },
    {
      headline: "Default can create liability for much of the remaining lease term",
      attention_level: "high_attention",
      legal_gibberish: "After termination for Tenant default, the Lessor may seek unpaid earned rent, certain rent that would have been earned through the balance of the term, and other detrimental amounts caused by the failure to perform.",
      danger: "The Tenant may lose possession yet remain exposed to substantial future-rent and related claims, while the draft contains no ordinary early-termination or negotiated buyout right.",
      fix: "Before signing, negotiate a defined early-exit or buyout option, confirm the cure period, require prompt commercially reasonable re-letting efforts and documented credits, and limit additional default damages to clearly defined, non-duplicative amounts.",
      location: "Paragraph 16",
    },
    {
      headline: "Taxes and common-area charges are open-ended",
      attention_level: "high_attention",
      legal_gibberish: "The Tenant pays property-tax increases and, where applicable, a pro-rata share of common-area maintenance, taxes, and insurance, with those amounts treated as additional rent.",
      danger: "The lease provides no base-year figures, allocation formula, annual budget, cap, exclusions, reconciliation deadline, supporting-document right, or audit process, so total occupancy cost cannot be calculated.",
      fix: "Before signing, attach the current tax and operating-expense statements; define the pro-rata formula and exclusions; add annual estimates and reconciliation deadlines; provide inspection and audit rights; and negotiate caps for controllable common-area expenses.",
      location: "Paragraphs 18-19",
    },
    {
      headline: "Repair responsibility may shift major building systems to the Tenant",
      attention_level: "important",
      legal_gibberish: "The Tenant must maintain plate glass, wiring, plumbing, heating, other systems or equipment, and adjacent areas; a checkbox provision may make the Tenant responsible for all repairs except listed structural items, but the checkbox and exception line are blank.",
      danger: "The unfinished choice makes responsibility unclear and could place expensive pre-existing or capital repairs on the Tenant without a condition report, age information, warranty, or cost limit.",
      fix: "Before signing, complete or delete the checkbox provision, attach a condition and systems report, assign structural and capital replacements to the Lessor, and limit the Tenant to routine maintenance and damage it causes.",
      location: "Paragraph 5",
    },
    {
      headline: "The Lessor may delay possession for up to 120 days without damages",
      attention_level: "important",
      legal_gibberish: "If possession is unavailable at commencement, rent is suspended but the lease remains in force, the Lessor is not liable for resulting damage, and the Tenant may terminate only after 120 days.",
      danger: "The rent protection helps, but the Tenant may still carry moving, staffing, inventory, financing, or lost-opening costs for up to four months without contractual reimbursement or an earlier exit.",
      fix: "Before signing, add a firm outside delivery date tied to the business opening, a Tenant termination right after a shorter delay, return of all deposits and prepaid amounts, and responsibility for specifically agreed delay costs or build-out consequences.",
      location: "Paragraph 11",
    },
    {
      headline: "Long casualty repairs may continue at the Lessor's discretion",
      attention_level: "important",
      legal_gibberish: "If partial-destruction repairs cannot be completed within 60 days, the Lessor may choose to repair within a reasonable time while the lease continues with proportionate rent abatement; termination is available if the Lessor does not elect to repair.",
      danger: "The Tenant receives rent reduction but no clear outside repair date or express termination right when the Lessor elects a lengthy repair that materially disrupts operations.",
      fix: "Before signing, add a Tenant termination right if restoration is not completed by a fixed outside date, define rent abatement for unusable access and services, and require a prompt written repair estimate and election from the Lessor.",
      location: "Paragraph 15",
    },
    {
      headline: "Future property financing automatically outranks the lease",
      attention_level: "important",
      legal_gibberish: "The lease is automatically subordinate to existing and future liens, mortgages, deeds of trust, ground leases, and related advances, and the Tenant must sign further subordination documents on demand.",
      danger: "The clause does not promise non-disturbance, so the document does not protect the Tenant's continued possession if a lender or other superior interest enforces its rights.",
      fix: "Before signing, condition subordination on receiving a signed subordination, non-disturbance, and attornment agreement from each current and future lender, protecting possession while the Tenant is not in default.",
      location: "Paragraph 24",
    },
    {
      headline: "This is a 2008 sample with drafting artifacts",
      attention_level: "document_quality",
      legal_gibberish: "Every page calls the document a sample, advises both parties to obtain legal advice, and identifies a law office; the signature date is formatted '200__,' and the final page includes an internal Windows file path.",
      danger: "The form shows its age and drafting origin and does not itself confirm that its California, SBA, insurance, notice, or remedy language matches the current transaction or current requirements.",
      fix: "Before using it, have a current California commercial-lease professional replace the sample with transaction-specific language, remove obsolete drafting artifacts, and verify any SBA provisions only if the parties actually participate in the applicable program.",
      location: "Page footers, Paragraph 4, and signature page",
    },
  ],
};

export function createCommercialLeaseLocalDelivery() {
  return {
    contract_id: COMMERCIAL_LEASE_CONTRACT_ID,
    intent: "considering_signing" as const,
    payment_status: "unpaid",
    paid: false,
    preview: createAnalysisPreview(commercialLeaseReport),
    report: commercialLeaseReport,
    full_report_preview: true,
    checkout_enabled: false,
    report_expires_at: "2026-10-20T16:00:00.000Z",
    local_fixture: true,
  };
}

export function getLocalReportFixture(contractId: string, recoveryToken: string) {
  if (contractId === TEST_07_CONTRACT_ID && recoveryToken === TEST_07_RECOVERY_TOKEN) {
    return createTest07LocalDelivery();
  }
  if (
    contractId === RESIDENTIAL_LEASE_CONTRACT_ID &&
    recoveryToken === RESIDENTIAL_LEASE_RECOVERY_TOKEN
  ) {
    return createResidentialLeaseLocalDelivery();
  }
  if (
    contractId === COACHING_AGREEMENT_CONTRACT_ID &&
    recoveryToken === COACHING_AGREEMENT_RECOVERY_TOKEN
  ) {
    return createCoachingAgreementLocalDelivery();
  }
  if (
    contractId === EMPLOYEE_CONTRACT_ID &&
    recoveryToken === EMPLOYEE_CONTRACT_RECOVERY_TOKEN
  ) {
    return createEmployeeContractLocalDelivery();
  }
  if (
    contractId === COMMERCIAL_LEASE_CONTRACT_ID &&
    recoveryToken === COMMERCIAL_LEASE_RECOVERY_TOKEN
  ) {
    return createCommercialLeaseLocalDelivery();
  }
  return null;
}

export function isLocalReportFixtureId(contractId: string) {
  return (
    contractId === TEST_07_CONTRACT_ID ||
    contractId === RESIDENTIAL_LEASE_CONTRACT_ID ||
    contractId === COACHING_AGREEMENT_CONTRACT_ID ||
    contractId === EMPLOYEE_CONTRACT_ID ||
    contractId === COMMERCIAL_LEASE_CONTRACT_ID
  );
}
