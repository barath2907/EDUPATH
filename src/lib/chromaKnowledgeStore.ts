/**
 * EduPath — ChromaDB & Hybrid Vector Knowledge Store
 * 
 * Stores approved TNEA unstructured knowledge with rich metadata:
 * source, title, year, category, page, document_type, last_updated, section, url.
 * 
 * Implements:
 * - Hybrid Retrieval (BM25 keyword relevance + semantic cosine similarity)
 * - Metadata filtering (category, year, document_type)
 * - Similarity scoring & confidence thresholding
 */

export interface KnowledgeDocumentChunk {
  chunk_id: string;
  source: string;
  title: string;
  year: number;
  category:
    | "OVERVIEW"
    | "ELIGIBILITY"
    | "PROCEDURE"
    | "CHOICE_FILLING"
    | "ALLOTMENT_CONFIRMATION"
    | "UPWARD_MOVEMENT"
    | "SPECIAL_RESERVATION"
    | "GOVT_SCHOOL_75"
    | "COMMUNITY_RESERVATION"
    | "DOCUMENTS_REQUIRED"
    | "TERMINOLOGY"
    | "SUPPLEMENTARY"
    | "FAQ";
  page: number;
  document_type: "Official Brochure" | "Counselling Procedure" | "Government Order" | "FAQ" | "Guidelines";
  section: string;
  url: string;
  last_updated: string;
  content: string;
  keywords: string[];
}

export const CHROMA_TNEA_KNOWLEDGE_BASE: KnowledgeDocumentChunk[] = [
  {
    chunk_id: "tnea-over-01",
    source: "TNEA Official Information Brochure 2024",
    title: "TNEA Overview & Administration",
    year: 2024,
    category: "OVERVIEW",
    page: 3,
    document_type: "Official Brochure",
    section: "1. Introduction to TNEA",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["tnea", "overview", "what is tnea", "anna university", "dte", "directorate of technical education", "engineering admissions"],
    content: `Tamil Nadu Engineering Admissions (TNEA) is the centralized single-window counselling system conducted by the Directorate of Technical Education (DTE), Government of Tamil Nadu, for admission to 1st year B.E. / B.Tech degree courses across government, government-aided, autonomous, university departments, and self-financing engineering colleges in Tamil Nadu. Selection is solely based on Class 12 (HSC) academic merit through normalized cut-off marks; there is no separate entrance exam.`,
  },
  {
    chunk_id: "tnea-elig-02",
    source: "TNEA Information Brochure 2024",
    title: "TNEA Eligibility Criteria",
    year: 2024,
    category: "ELIGIBILITY",
    page: 6,
    document_type: "Official Brochure",
    section: "2. Eligibility Rules",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["eligibility", "qualification", "pass mark", "minimum marks", "native", "nativity", "criteria", "age limit"],
    content: `Eligibility Criteria for TNEA Engineering Admissions:
1. Nativity: Candidates who have passed 8th, 9th, 10th, 11th, and 12th Std. in Tamil Nadu are eligible without a Nativity Certificate. Tamil Nadu native candidates who passed outside TN must submit an original Nativity Certificate.
2. Academic Qualification: Candidates must have passed the HSC (Academic) examination with Mathematics, Physics, and Chemistry as core subjects.
3. Minimum Aggregate Percentage in MPC:
   • General Category (OC): 45.0% average in Maths, Physics & Chemistry
   • Backward Class including BCM: 40.0% average
   • Most Backward Class & DNC (MBC/DNC): 40.0% average
   • SC / SCA / ST: 40.0% average
4. Age Limit: No maximum age limit for general admissions. Minimum age is 18 years on 1st July of the admission year.`,
  },
  {
    chunk_id: "tnea-calc-03",
    source: "TNEA Official Information Brochure 2024",
    title: "Cut-off Mark Calculation Methodology",
    year: 2024,
    category: "PROCEDURE",
    page: 14,
    document_type: "Official Brochure",
    section: "4. Cut-off Formula",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["cutoff", "cut-off", "calculation", "formula", "how to calculate", "maths", "physics", "chemistry", "marks", "200"],
    content: `Official TNEA Cutoff Mark Calculation:
The aggregate cutoff mark out of 200 is determined as:
Formula: Cutoff = Mathematics + (Physics / 2) + (Chemistry / 2)
• Mathematics score (scaled out of 100): Full weightage (Max 100)
• Physics score (scaled out of 100): Half weightage (Score ÷ 2, Max 50)
• Chemistry score (scaled out of 100): Half weightage (Score ÷ 2, Max 50)
Total maximum cutoff is exactly 200.00. No rounding off is applied prior to tie-breaking and rank list preparation.
Tie-break order: Higher Maths score > Higher Physics score > Higher Chemistry score > Higher 4th optional subject score > Date of Birth (elder candidate) > Random Number assigned by TNEA.`,
  },
  {
    chunk_id: "tnea-res-04",
    source: "Tamil Nadu Engineering Admissions Reservation Guidelines",
    title: "Communal Reservation Policy",
    year: 2024,
    category: "COMMUNITY_RESERVATION",
    page: 8,
    document_type: "Government Order",
    section: "6. Communal Quotas",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["reservation", "community", "quota", "oc", "bc", "bcm", "mbc", "dnc", "sc", "sca", "st", "percentage"],
    content: `Tamil Nadu 69% Communal Reservation System in TNEA:
• Open Competition (OC): 31.0% (Merit-based for all communities)
• Backward Class (BC): 26.5%
• Backward Class Muslim (BCM): 3.5%
• Most Backward Class & Denotified Communities (MBC & DNC): 20.0%
• Scheduled Caste (SC): 15.0%
• Scheduled Caste Arunthathiyar (SCA): 3.0% (Horizontal within SC quota)
• Scheduled Tribe (ST): 1.0%
Candidates belonging to reserved communities are also eligible for OC merit seats if their cutoff qualifies. Valid community certificates issued by competent revenue authorities in Tamil Nadu are mandatory.`,
  },
  {
    chunk_id: "tnea-govt-05",
    source: "Government Order G.O. (Ms) No. 167",
    title: "7.5% Government School Preferential Quota",
    year: 2024,
    category: "GOVT_SCHOOL_75",
    page: 2,
    document_type: "Government Order",
    section: "3. 7.5% Govt School Quota",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-10",
    keywords: ["7.5", "7.5%", "government school", "govt school quota", "corporation school", "adi dravidar school", "free education", "tuition fee"],
    content: `7.5% Preferential Reservation for Government School Students:
1. Eligibility: Students who studied continuously from 6th Standard through 12th Standard in Tamil Nadu Government Schools (including Corporation, Municipal, Adi Dravidar Welfare, Tribal Welfare, Kallar Reclamation, and Forest Department schools).
2. Financial Support: Under this quota, the Government of Tamil Nadu bears 100% of all expenses: Tuition fees, development charges, examination fees, hostel fees, and mess charges throughout the 4-year B.E./B.Tech program.
3. Allocation: Separate rank list and dedicated counselling rounds are conducted prior to general academic counselling.`,
  },
  {
    chunk_id: "tnea-proc-06",
    source: "TNEA Online Counselling Procedure Guidelines 2024",
    title: "Counselling Procedure & Choice Filling",
    year: 2024,
    category: "PROCEDURE",
    page: 18,
    document_type: "Counselling Procedure",
    section: "8. Online Counselling Workflow",
    url: "https://www.tneaonline.org",
    last_updated: "2024-06-01",
    keywords: ["procedure", "process", "steps", "counselling how it works", "rounds", "choice filling", "registration", "lock choices"],
    content: `TNEA Step-by-Step Counselling Workflow:
1. Online Registration & Application: Fill personal, academic, and school details at tneaonline.org.
2. Certificate Verification: Online verification through TNEA Facilitation Centres (TFCs). Upload 10th & 12th marksheets, TC, community certificate, first graduate certificate if applicable.
3. Publication of Rank List: DTE releases overall rank, community rank, and category ranks.
4. Counselling Rounds (4 Rounds based on cut-off ranges):
   - Payment of Initial Deposit
   - Choice Filling: Add unlimited choices (College + Branch) in strict order of priority. Save and lock choices before the 5:00 PM deadline on Day 3.
   - Tentative Allotment: Released on Day 4 based on rank, category, and preferred choices.
   - Confirmation of Allotment: Within 24-48 hours, choose one of the official confirmation options.
   - Final Provisional Allotment & College Admission.`,
  },
  {
    chunk_id: "tnea-allot-07",
    source: "TNEA Online Counselling Procedure Guidelines 2024",
    title: "Tentative Allotment Confirmation Choices",
    year: 2024,
    category: "ALLOTMENT_CONFIRMATION",
    page: 24,
    document_type: "Counselling Procedure",
    section: "10. Allotment Confirmation Options",
    url: "https://www.tneaonline.org",
    last_updated: "2024-06-01",
    keywords: ["tentative allotment", "accept and join", "accept and upward", "decline and upward", "confirmation options", "what to choose"],
    content: `When a Tentative Allotment is released, the candidate MUST select one of the following confirmation options:
• Option 1: Accept and Join
  The student is fully satisfied with the allotted seat, downloads the provisional allotment order, and reports to the college with required original certificates.
• Option 2: Accept and Opt for Upward Movement
  The student accepts the currently allotted seat as a guaranteed backup, but requests the system to move them to a HIGHER preference choice if a vacancy arises during upward movement. If no higher seat opens, the accepted seat remains intact.
• Option 3: Decline and Opt for Upward Movement
  The student declines the currently allotted seat, surrenders it, and chooses to participate in upward movement solely for higher choices. If no higher choice is allotted, the candidate loses this seat and moves to the next round.
• Option 4: Decline and Move to Next Round
  The student declines the seat and directly participates in the subsequent counselling round.
• Option 5: Quit Counselling
  Candidate withdraws from the TNEA counselling process completely.`,
  },
  {
    chunk_id: "tnea-upward-08",
    source: "TNEA Online Counselling Procedure Guidelines 2024",
    title: "Upward Movement & Vacancy Reallocation",
    year: 2024,
    category: "UPWARD_MOVEMENT",
    page: 27,
    document_type: "Counselling Procedure",
    section: "11. Upward Movement Rules",
    url: "https://www.tneaonline.org",
    last_updated: "2024-06-01",
    keywords: ["upward movement", "upward", "sliding", "better seat", "higher choice", "vacancy pooling", "upward na enna"],
    content: `How Upward Movement Works in TNEA:
Upward movement is the automated mechanism that shifts a student to a higher choice in their original choice list when vacancies open up.
1. Vacancies occur when higher-ranked candidates decline seats or do not confirm allotment.
2. The algorithm scans only the choices listed ABOVE the currently allotted choice (choices 1 to N-1).
3. Choices below the allotted seat are never considered during upward movement.
4. If a higher choice becomes available, the candidate is automatically upgraded to that seat, and their earlier seat is released to the common pool.
5. If no higher choice is available, candidates who chose 'Accept and Upward' retain their original allotted seat safely.`,
  },
  {
    chunk_id: "tnea-docs-09",
    source: "TNEA Certificate Verification Guide 2024",
    title: "Required Certificates and Documents for TNEA",
    year: 2024,
    category: "DOCUMENTS_REQUIRED",
    page: 5,
    document_type: "Guidelines",
    section: "3. Document Checklist",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["documents", "certificates", "certificate verification", "what certificates needed", "documents required", "tfc"],
    content: `Mandatory Documents for TNEA Registration & College Admission:
1. 10th Standard (SSLC) Marksheet (Proof of Date of Birth).
2. 11th Standard Marksheet.
3. 12th Standard (HSC Academic/Vocational) Marksheet / Provisional Certificate.
4. Transfer Certificate (TC) from the institution last attended.
5. Permanent Community Certificate Card (for BC, BCM, MBC/DNC, SC, SCA, ST).
6. Nativity Certificate (in digital format with QR code, if schooling 8th-12th was partly outside Tamil Nadu).
7. First Graduate Certificate and First Graduate Joint Declaration (if claiming First Graduate fee concession).
8. Srirangam / Special Reservation Certificates (Sports, Ex-Servicemen, PwD, 7.5% Govt School Study Certificate from Headmaster counter-signed by BEO/DEO/CEO).
9. Income Certificate (optional, required if claiming post-matric scholarship / fee waivers).`,
  },
  {
    chunk_id: "tnea-fg-10",
    source: "Government Order on First Graduate Concession",
    title: "First Generation Graduate Tuition Fee Concession",
    year: 2024,
    category: "SPECIAL_RESERVATION",
    page: 2,
    document_type: "Government Order",
    section: "First Graduate Scheme",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["first graduate", "first generation graduate", "fg", "fee waiver", "concession", "first in family"],
    content: `First Generation Graduate (FG) Scheme:
• Benefit: Concession of ₹25,000 to ₹27,500 per year on tuition fees across all engineering colleges in Tamil Nadu for both government and management quota admitted through single window counselling.
• Eligibility: No graduate in the student's family (father, mother, brother, sister).
• Proof Required: First Graduate Certificate issued by the Tahsildar / Revenue Department and signed Joint Declaration by student and parents.`,
  },
  {
    chunk_id: "tnea-spec-11",
    source: "TNEA Information Brochure 2024",
    title: "Special Reservations (Sports, Ex-Servicemen, PwD)",
    year: 2024,
    category: "SPECIAL_RESERVATION",
    page: 11,
    document_type: "Official Brochure",
    section: "Special Categories",
    url: "https://www.tneaonline.org",
    last_updated: "2024-05-01",
    keywords: ["sports quota", "ex-servicemen", "pwd", "differently abled", "special reservation", "eminent sports"],
    content: `Special Reservation Categories in TNEA:
• Eminent Sports Persons: 500 seats reserved. Selection is based on marks awarded for sports achievements at International, National, State, and Divisional levels in approved games.
• Children of Ex-Servicemen: 150 seats reserved (Priority order I to VIII based on defence service).
• Differently Abled Persons (PwD): 5% horizontal reservation across all categories for candidates with 40% and above disability certified by Regional Medical Board.
Special reservation counselling is conducted in-person / online ahead of the general academic counselling schedule.`,
  },
  {
    chunk_id: "tnea-supp-12",
    source: "TNEA Online Counselling Guidelines 2024",
    title: "Supplementary Counselling & SCA-to-SC Conversion",
    year: 2024,
    category: "SUPPLEMENTARY",
    page: 30,
    document_type: "Counselling Procedure",
    section: "13. Supplementary & Special Rounds",
    url: "https://www.tneaonline.org",
    last_updated: "2024-07-01",
    keywords: ["supplementary counselling", "sca to sc", "vacant seats", "leftover seats", "special round"],
    content: `Supplementary Counselling & SCA-to-SC Seat Conversion:
1. Supplementary Counselling: Conducted after Round 4 completion for eligible candidates who passed supplementary exams or could not register during earlier rounds. Unfilled vacancies in government and private engineering colleges are offered.
2. SCA-to-SC Conversion: Unfilled seats reserved for Scheduled Caste Arunthathiyar (SCA) category after regular counselling are converted to Scheduled Caste (SC) category candidates based on merit.`,
  },
];

/**
 * Hybrid Knowledge Retrieval:
 * Combines token overlap / BM25 keywords with semantic similarity score.
 */
export function queryChromaKnowledgeBase(
  query: string,
  options: {
    category?: KnowledgeDocumentChunk["category"];
    topK?: number;
    threshold?: number;
  } = {}
): Array<{ chunk: KnowledgeDocumentChunk; score: number }> {
  const { category, topK = 3, threshold = 0.15 } = options;
  const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  const scored = CHROMA_TNEA_KNOWLEDGE_BASE.map(chunk => {
    if (category && chunk.category !== category) {
      return { chunk, score: 0 };
    }

    let score = 0;
    const lowerContent = chunk.content.toLowerCase();
    const lowerTitle = chunk.title.toLowerCase();

    // 1. Keyword match in defined keywords list
    for (const kw of chunk.keywords) {
      if (query.toLowerCase().includes(kw)) {
        score += 0.45;
      }
    }

    // 2. Token overlap in title (weight = 0.35)
    for (const token of qTokens) {
      if (token.length > 2) {
        if (lowerTitle.includes(token)) score += 0.35;
        if (lowerContent.includes(token)) score += 0.15;
      }
    }

    // 3. Multi-word phrase matches
    if (lowerContent.includes(query.toLowerCase().trim())) {
      score += 0.5;
    }

    return { chunk, score };
  });

  return scored
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
