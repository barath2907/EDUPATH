PROJECT NAME:
EduPath – AI-Powered TNEA College Admission Prediction and
Personalized Counselling Application

ROLE:
Act as a Senior Full-Stack Software Engineer, AI/ML Engineer,
Data Engineer, UI/UX Designer, Database Architect, and QA Engineer.

Your responsibility is to design, develop, test, and integrate a
complete EduPath application using professional software engineering
practices.

Build a genuinely functional application, not merely a UI prototype.

============================================================
1. PROJECT VISION
============================================================

Build EduPath, an AI-powered college admission and counselling
application designed to assist students participating in Tamil Nadu
Engineering Admissions (TNEA).

The application should allow a student to:

1. Create an account and securely log in.
2. Create and manage a student profile.
3. Upload a marksheet.
4. Extract marks from the uploaded marksheet where technically
   supported.
5. Review and correct extracted marks.
6. Calculate the TNEA engineering cutoff using the verified
   applicable calculation rules.
7. Use a trained ML model to estimate admission suitability.
8. Receive personalized college and branch recommendations.
9. Compare colleges using available verified information.
10. Ask questions through an AI RAG Counsellor.
11. Receive explanations supported by approved documents and
    verified database records.
12. Generate and download a personalized counselling report.

The application must be professional, responsive, secure,
accessible, and easy for students to understand.

============================================================
2. DEVELOPMENT RULES
============================================================

Before coding:

- Inspect all existing project files and uploaded resources.
- Understand the current application architecture.
- Identify existing functionality that can be reused.
- Check the current database schema and authentication setup.
- Identify missing features and dependencies.
- Prepare a phase-by-phase implementation plan.

If an existing EduPath application is available:

- Extend the existing application.
- Preserve working modules and existing student records.
- Avoid unnecessary rewrites.
- Do not replace functioning features with static mockups.

If starting from an empty project:

- Establish a clean, maintainable architecture.
- Use reusable components and modular services.
- Separate frontend, backend, ML, and RAG responsibilities.

Do not claim that a feature is complete until its implementation
and relevant tests have actually succeeded.

Do not fabricate TNEA data, ML results, source documents, API
responses, or test outcomes.

============================================================
3. TECHNOLOGY ARCHITECTURE
============================================================

Inspect the available environment and use compatible technologies.

Preferred architecture:

MOBILE APPLICATION:
- Expo.
- React Native.
- TypeScript.
- Expo Router.
- React Hook Form.
- Zod validation.
- Reusable UI components.
- Accessible navigation and touch targets.

BACKEND:
- Existing Express API if already present.
- TypeScript.
- REST API with request validation.
- Secure authentication middleware.
- Structured error handling.

DATABASE AND AUTHENTICATION:
- Supabase Auth.
- Supabase PostgreSQL.
- Row Level Security.
- Database migrations.
- Appropriate indexes and foreign keys.

ML SERVICE:
- Python.
- pandas.
- scikit-learn.
- XGBoost only if appropriate and available.
- FastAPI if a separate model-serving service is required.

RAG SERVICE:
- Gemini as the initial LLM provider.
- Official Google Gen AI SDK.
- PostgreSQL with pgvector or a compatible vector store.
- Document ingestion, chunking, embeddings, retrieval, and
  grounded response generation.

REPORT GENERATION:
- Generate downloadable PDF counselling reports using a
  suitable server-side PDF library.

IMPORTANT:
Do not introduce every technology unnecessarily.

Inspect the repository first and adapt the architecture to the
actual project.

Do not place server secrets, database credentials, or private API
keys inside mobile frontend code.

============================================================
PHASE 1 – DATA DISCOVERY AND REAL TNEA DATA COLLECTION
============================================================

OBJECTIVE:

Obtain, verify, clean, and organize the real TNEA information
required by EduPath.

Official starting points:

https://www.tneaonline.org/
https://cutoff.tneaonline.org/
https://www.dte.tn.gov.in/

Use authorized publicly accessible records and documents.

First determine:

- Which official datasets are available.
- Which counselling years are covered.
- Which college and branch records are available.
- Whether category-wise cutoff information is available.
- Whether official downloadable files exist.
- Whether documented API access is available.
- What usage restrictions apply.

Do not invent API endpoints.

Do not bypass CAPTCHA, authentication, access restrictions, or
technical protections.

If no authorized API is available, create a documented import
pipeline for official CSV, XLSX, or PDF records.

Collect available information such as:

- College code.
- College name.
- Branch code.
- Branch name.
- District and location.
- Counselling year.
- Community/category.
- Cutoff marks.
- Opening and closing ranks, where available.
- Counselling round.
- College fees, where verifiable.
- Source document and source URL.
- Publication date.
- Verification status.

Preserve the source and academic year associated with each record.

DATA QUALITY:

- Normalize college and branch names.
- Preserve official codes.
- Detect duplicates.
- Validate numeric fields.
- Identify missing data.
- Flag conflicting records.
- Track data provenance.
- Separate verified data from unverified data.

Create an administrator-assisted import workflow where needed.

Do not claim that all TNEA records have been obtained unless
coverage has actually been verified.

DELIVERABLES:

1. Source inventory.
2. Dataset schema.
3. Data acquisition status.
4. Data cleaning and validation pipeline.
5. Import history.
6. Data coverage and quality report.
7. Documented remaining data gaps.

TESTING:

Test imports using real authorized records and empty templates.

An empty template must not be reported as a successful data import.

============================================================
PHASE 2 – SUPABASE DATABASE AND AUTHENTICATION
============================================================

OBJECTIVE:

Implement a secure authentication system and the database needed
by EduPath.

AUTHENTICATION:

Provide:

- Student registration.
- Username or display name.
- Email address.
- Password.
- Login.
- Logout.
- Forgot password.
- Password reset.
- Session persistence.
- Appropriate email verification where configured.
- Friendly authentication error messages.

Use Supabase Auth or another appropriate secure authentication
provider.

Do not store plaintext passwords in a custom profile table.

Use the authentication provider's secure password management.

If username-based login is required, implement it through a
secure, properly validated username-to-account lookup design.

Do not expose private user information through username lookups.

STUDENT PROFILE:

Create a profile containing appropriate fields such as:

- User ID.
- Display name.
- Email.
- Student's preferred language.
- Preferred districts.
- Preferred engineering branches.
- Budget preference.
- Community/category when voluntarily supplied and required
  for the student's requested counselling calculation.
- Academic information.
- Profile completion status.

Do not require sensitive information unless it is necessary for
a requested feature.

Allow students to update their profile.

Ensure each student can access only their own private data.

DATABASE TABLES:

Inspect the existing database before creating tables.

Implement suitable tables for:

- profiles.
- colleges.
- branches.
- tnea_cutoff_records.
- student_academic_records.
- student_preferences.
- student_choices.
- recommendation_runs.
- prediction_results.
- counselling_reports.
- knowledge_base_documents.
- document_chunks or vector records.
- import_batches.
- import_errors.

Add necessary constraints, indexes, and relationships.

Use migrations and preserve existing records.

SECURITY:

- Configure appropriate Row Level Security.
- Restrict administrator operations.
- Validate API requests.
- Protect authenticated routes.
- Do not expose service-role credentials.
- Avoid logging passwords or unnecessary personal data.

DEMO PROFILE:

Create an optional development/demo account using a safe
development-only process.

Do not hardcode a shared production password.

Clearly label demo data as demonstration data.

Never allow the demo account to access real students' private data.

TESTING:

Test registration, login, logout, session persistence, profile
creation, profile updates, password reset, and access restrictions.

============================================================
PHASE 3 – MARKSHEET UPLOAD AND CUTOFF CALCULATOR
============================================================

OBJECTIVE:

Create a distinctive EduPath feature:

"Smart Marksheet Scanner and TNEA Cutoff Calculator"

USER WORKFLOW:

1. Student opens the cutoff calculator.
2. Student uploads a marksheet.
3. Application validates the file.
4. The extraction service attempts to read supported marks.
5. Extracted values are shown to the student.
6. Student reviews and corrects the values.
7. Student confirms the marks.
8. The application calculates the cutoff.
9. The calculation is displayed with a transparent breakdown.
10. The verified marks can be saved to the student's profile
    with their consent.

SUPPORTED FILES:

Support suitable formats such as:

- PDF.
- JPG/JPEG.
- PNG.

Enforce file-size limits and validate file contents.

Do not trust a filename extension alone.

MARKS EXTRACTION:

Use OCR or an appropriate document extraction service.

Do not assume all marksheets have the same layout.

If extraction confidence is low:

- Ask the student to review the extracted values.
- Highlight uncertain fields.
- Allow manual entry.
- Do not silently guess missing marks.

CUTOFF CALCULATION:

Verify the applicable official TNEA cutoff calculation method
for the relevant admission year before implementing it.

Use the verified subject weighting and normalization rules.

For the commonly used engineering cutoff structure, the
calculation is based on Mathematics out of 100, Physics
contributing up to 50, and Chemistry contributing up to 50,
for a total of 200.

However, verify the relevant year's official rules and handle
any differences before applying this formula.

Display:

- Mathematics contribution.
- Physics contribution.
- Chemistry contribution.
- Total cutoff.
- Applicable calculation method.
- Academic year or rule version.
- Whether values were manually entered or OCR-extracted.

Do not claim OCR extraction is correct without student review.

Do not claim the cutoff is official if it is based on unverified
marks or unverified calculation rules.

PRIVACY:

- Explain why the marksheet is requested.
- Obtain appropriate user consent.
- Protect uploaded files.
- Restrict access to the owner.
- Avoid retaining original documents longer than necessary.
- Provide a way to delete uploaded marksheet files and associated
  stored data where applicable.

TESTING:

Test supported file formats, invalid files, unreadable documents,
incorrect marks, manual corrections, cutoff calculations, and
file access restrictions.

============================================================
PHASE 4 – ADMISSION ML MODEL DEVELOPMENT
============================================================

OBJECTIVE:

Develop and evaluate a machine-learning model that estimates
college/branch admission suitability using real, relevant data.

Do not simply generate random admission probabilities.

DATASET:

Inspect the available real dataset.

Determine whether it contains suitable features and a valid
target variable for model training.

Potential features, where available and appropriate:

- Student cutoff.
- Community/category.
- College code.
- Branch code.
- Historical cutoff records.
- Academic year.
- Counselling round.
- Relevant verified admission or allotment outcomes.

Do not train a model using fabricated labels.

Do not treat a cutoff record alone as proof that an individual
student was admitted.

MODEL DEVELOPMENT:

1. Define the prediction target.
2. Inspect class balance and data quality.
3. Remove duplicates and leakage.
4. Split training and testing data appropriately.
5. Respect academic-year chronology where appropriate.
6. Establish a baseline model.
7. Evaluate Random Forest.
8. Evaluate XGBoost if appropriate.
9. Compare models using documented metrics.
10. Select a model based on evidence, not assumptions.
11. Calibrate probabilities if the data supports calibration.
12. Record model version and training dataset provenance.

Evaluate suitable metrics such as:

- Precision.
- Recall.
- F1 score.
- ROC-AUC where appropriate.
- PR-AUC where appropriate.
- Brier score or calibration measures where appropriate.

Do not report metrics that have not been calculated.

Do not use training accuracy as the only evidence of model quality.

ADMISSION ESTIMATES:

Distinguish clearly between:

A. Historical cutoff comparison.
B. Rule-based suitability estimate.
C. ML-generated admission probability.
D. Actual official admission outcome.

Only display a numerical probability if the model has been trained,
evaluated, and calibrated sufficiently for that interpretation.

If reliable training data is unavailable:

- Do not fabricate a trained model.
- Do not display fake probabilities.
- Provide historical cutoff comparisons or clearly labelled
  rule-based suitability information instead.
- Explain that ML predictions are unavailable until the model
  is trained and validated.

Avoid guaranteed admission language.

MODEL SERVING:

Create a secure backend prediction endpoint.

Validate input values.

Return:

- Prediction or suitability estimate.
- Model version.
- Relevant historical evidence.
- Important limitations.
- Explanation of the factors used, where supported.

TESTING:

Test model loading, valid and invalid inputs, missing values,
data leakage safeguards, model versioning, and prediction output.

============================================================
PHASE 5 – PERSONALIZED COLLEGE AND BRANCH RECOMMENDATIONS
============================================================

OBJECTIVE:

Recommend colleges and branches based on the student's marks,
preferences, and verified TNEA information.

INPUTS:

- Confirmed cutoff marks.
- Community/category, where relevant.
- Preferred branches.
- Preferred districts.
- Budget preference.
- Relevant historical cutoff data.
- Other verified student preferences.

RECOMMENDATION OUTPUT:

Display:

- College name.
- College code.
- Branch name.
- Branch code.
- District/location.
- Relevant historical cutoff.
- Academic year of the cutoff.
- Comparison with the student's cutoff.
- Available verified fee information.
- Explanation of why the option was recommended.
- Data completeness and limitations.

Provide filters such as:

- District.
- Branch.
- Community/category.
- Historical year.
- Budget, where verified.
- Suitability category, where supported.

If using labels such as "Reach", "Match", or "Safer option",
define their methodology and clearly state that they are
estimates, not admission guarantees.

Do not label an option "safe" solely because the student's
cutoff exceeds one historical cutoff.

Do not rank colleges using fabricated ratings or unsupported
claims.

Allow students to:

- Save colleges.
- Remove saved colleges.
- Compare colleges.
- Revisit recommendation results.

TESTING:

Test recommendations across different marks, categories,
branches, districts, missing data, and historical years.

============================================================
PHASE 6 – RAG AI COUNSELLOR AGENT
============================================================

OBJECTIVE:

Build an AI Counsellor that answers TNEA questions using approved
documents and verified EduPath database information.

LLM:

Use Google Gemini as the initial provider.

Use the official Google Gen AI SDK and currently supported
model identifiers.

Keep the provider integration modular.

Do not use Anthropic.

Store API credentials only in secure server-side secrets.

KNOWLEDGE BASE:

Use authorized and verified materials such as:

- Official TNEA information brochures.
- Counselling instructions.
- Eligibility documents.
- Reservation/category instructions.
- Official counselling schedules.
- Official announcements.
- Verified college and branch records.
- Approved supplementary documents.

DOCUMENT PROCESSING:

Implement:

1. Document upload or authorized ingestion.
2. File validation.
3. Text extraction.
4. Chunking.
5. Metadata preservation.
6. Embedding generation.
7. Vector storage.
8. Retrieval.
9. Grounded answer generation.
10. Source attribution.

Preserve document title, year, page or section, source URL,
and verification status where available.

PERSONALIZED TOOLS:

Where implemented, allow the counsellor to call secure backend
tools for:

- Retrieving the authenticated student's preferences.
- Searching colleges and branches.
- Retrieving historical cutoff records.
- Requesting recommendation results.
- Comparing selected colleges.
- Retrieving saved college choices.

Never allow one student to access another student's private data.

GROUNDING:

The AI must:

- Use retrieved evidence for factual TNEA answers.
- Cite supporting documents or database records.
- Identify historical years clearly.
- Distinguish official information from supplementary sources.
- Explain when data is missing or conflicting.
- Abstain when sufficient evidence is unavailable.
- Never invent cutoff marks, deadlines, seat availability, or
  admission probabilities.
- Never guarantee admission.

LANGUAGE:

Support English and Tamil where the selected model and application
can reliably support them.

Test Tamil output before claiming reliable language support.

CHAT EXPERIENCE:

Provide:

- Chat history.
- Message input.
- Loading indicators.
- Retry controls.
- Suggested questions.
- Source references.
- Clear error messages.

TESTING:

Test general TNEA questions, historical cutoff questions,
personalized queries, unsupported questions, conflicting sources,
API failures, and authorization.

============================================================
PHASE 7 – PERSONALIZED PDF COUNSELLING REPORT
============================================================

OBJECTIVE:

Generate a downloadable counselling report using the student's
confirmed marks and actual recommendation results.

REPORT CONTENT:

1. EduPath branding.
2. Student's display name, if consented.
3. Report generation date.
4. Confirmed subject marks.
5. Cutoff calculation breakdown.
6. Calculation rule version.
7. Selected academic year.
8. Personalized college and branch recommendations.
9. Historical cutoff comparisons.
10. Admission ML estimates, only if genuinely available.
11. Explanation of recommendation methodology.
12. Important assumptions and limitations.
13. Data source references.
14. Disclaimer that recommendations are not official allotments
    and do not guarantee admission.

PDF REQUIREMENTS:

- Professional typography.
- Clear headings.
- Readable tables.
- Page numbering.
- Appropriate spacing.
- No clipped content.
- Correct Tamil rendering if Tamil reports are supported.
- Secure generation and download.

The report must contain the student's actual saved results.

Do not generate fictional recommendation results.

Provide a Download PDF button.

Allow the student to access only their own reports.

TESTING:

Test report generation, empty recommendation sets, long college
lists, special characters, Tamil rendering if supported, and
authorization.

============================================================
PHASE 8 – PROFESSIONAL UX/UI AND ANIMATIONS
============================================================

OBJECTIVE:

Create a consistent, polished, modern student experience across
the entire EduPath application.

DESIGN DIRECTION:

Create a premium, professional education-technology interface.

Use:

- A consistent design system.
- Carefully chosen typography.
- Consistent spacing.
- Clear information hierarchy.
- Responsive layouts.
- Accessible color contrast.
- Reusable cards and form components.
- Professional icons.
- Subtle gradients where appropriate.
- Consistent buttons and input fields.

ANIMATIONS:

Use tasteful animations for:

- Screen transitions.
- Card appearance.
- Loading states.
- Progress indicators.
- Recommendation result presentation.
- Cutoff calculation completion.
- Report generation status.
- Success and error feedback.

Animations must not interfere with accessibility, performance,
or usability.

Avoid excessive motion and unnecessary visual effects.

Provide reduced-motion behavior where appropriate.

SCREENS:

Implement or improve:

1. Welcome / onboarding.
2. Registration.
3. Login.
4. Forgot password.
5. Student dashboard.
6. Student profile.
7. Marksheet upload.
8. Cutoff calculator.
9. Cutoff result breakdown.
10. College recommendations.
11. College details.
12. College comparison.
13. Saved colleges.
14. AI RAG Counsellor.
15. Counselling report preview.
16. PDF download.
17. Settings.
18. Admin data management, restricted to authorized admins.

DASHBOARD:

Display useful, genuine information such as:

- Profile completion.
- Confirmed cutoff.
- Recent recommendations.
- Saved colleges.
- Recent counselling conversations.
- Available reports.

Do not display fabricated statistics.

EMPTY STATES:

When no data exists, explain what the student needs to do next.

ERROR STATES:

Provide understandable error messages and recovery actions.

============================================================
PHASE 9 – ADMIN DATA MANAGEMENT
============================================================

OBJECTIVE:

Provide secure tools for maintaining EduPath's verified reference
data and RAG documents.

ADMIN FEATURES:

- Import authorized CSV files.
- Preview uploaded records.
- Validate columns and values.
- Detect duplicates.
- Review rejected rows.
- Confirm imports.
- Track import history.
- View data coverage.
- Review document metadata.
- Track source verification.
- View model training status.
- View model version and evaluation summary.
- Review RAG ingestion status.

SECURITY:

- Restrict admin routes to authorized administrators.
- Enforce authorization on the backend and database.
- Do not rely only on hiding frontend navigation.
- Do not give admin access to ordinary student accounts.

Do not expose private student information unnecessarily.

============================================================
PHASE 10 – END-TO-END INTEGRATION AND TESTING
============================================================

OBJECTIVE:

Ensure all implemented modules work together.

TEST THE COMPLETE STUDENT JOURNEY:

1. Open EduPath.
2. Register a student account.
3. Verify authentication.
4. Complete the student profile.
5. Upload a marksheet.
6. Review and confirm extracted marks.
7. Calculate the cutoff.
8. Retrieve historical TNEA records.
9. Request college recommendations.
10. View recommendation explanations.
11. Compare colleges.
12. Save selected colleges.
13. Ask the RAG Counsellor a TNEA question.
14. Verify source references.
15. Request personalized counselling.
16. Generate a PDF report.
17. Download the report.
18. Log out.
19. Log in again.
20. Confirm that authorized saved information persists.

SECURITY TESTING:

- Unauthorized profile access.
- Unauthorized admin operations.
- Invalid file uploads.
- Malformed API requests.
- Cross-user data access.
- Secret exposure.
- Database authorization.
- Report access restrictions.

FUNCTIONAL TESTING:

- Empty datasets.
- Missing records.
- Duplicate records.
- Invalid marks.
- OCR errors.
- Model unavailable.
- Gemini unavailable.
- Retrieval failure.
- Network errors.
- PDF generation failure.

Do not mark a test as passed unless it was actually executed.

============================================================
11. DEPLOYMENT AND CONFIGURATION
============================================================

Inspect the actual project environment.

Identify the required configuration for:

- Supabase project.
- Database migrations.
- Authentication redirect URLs.
- Mobile deep links.
- Gemini API credentials.
- ML model service.
- Vector database.
- File storage.
- PDF generation.
- Production environment variables.

Never expose secrets in client-side bundles.

Provide clear setup instructions.

Do not claim that the app is deployed, production-ready, or
available in an app store unless that has actually happened.

============================================================
12. IMPLEMENTATION WORKFLOW
============================================================

Implement this project phase by phase.

For each phase:

1. Inspect the relevant existing code.
2. State the implementation plan briefly.
3. Implement the phase.
4. Run the relevant tests.
5. Fix errors.
6. Verify integration with completed phases.
7. Summarize files changed.
8. Report actual test results.
9. Identify remaining limitations.
10. Mark the phase complete only when its acceptance criteria
    are satisfied.

Do not silently skip difficult requirements.

If an external dependency, API, official dataset, credential,
or permission is unavailable:

- Explain exactly what is missing.
- Implement the parts that can genuinely be completed.
- Provide a clear configuration or data-acquisition step.
- Do not substitute fake data or fake functionality.

Do not claim all phases are complete merely because the UI exists.

============================================================
13. FINAL ACCEPTANCE CRITERIA
============================================================

EduPath should be considered functionally complete only when
the implemented features have been verified against these
requirements:

A. Authentication works securely.

B. Student profiles persist in the database.

C. Authorized TNEA records can be imported and queried.

D. The cutoff calculator applies the verified applicable rules.

E. Marksheet extraction allows student review and correction.

F. Admission ML predictions are shown only when a suitable
   model has genuinely been trained and evaluated.

G. Recommendations use actual database records.

H. The RAG Counsellor retrieves supporting evidence and provides
   source references.

I. Personalized counselling respects student authorization.

J. PDF reports contain actual student results and clear
   limitations.

K. The UI is consistent, polished, responsive, and accessible.

L. Existing functionality remains intact.

M. Relevant automated and manual tests have been executed.

N. Security and privacy requirements have been checked.

O. Remaining external dependencies and limitations are documented.

FINAL INSTRUCTION:

Build EduPath as a real, maintainable, secure application.

Prioritize correctness, data provenance, student privacy,
transparent admission estimates, professional UX, and reliable
integration.

Do not sacrifice factual accuracy to make the application appear
complete.

Begin by inspecting the repository and producing the phase plan.
Then proceed with Phase 1.