Act as a senior React Native, TypeScript, and AI application developer.

I am developing a final-year project called "EduPath – AI-Powered TNEA College Admission and Counselling Application".

Your task is to implement a complete MULTILINGUAL LANGUAGE SUPPORT feature throughout the existing EduPath application.

IMPORTANT:
Do not create a new application from scratch.
Inspect the existing project structure and integrate multilingual support into the current application without breaking any existing functionality.

==================================================
1. LANGUAGE SUPPORT
==================================================

Initially support the following languages:

1. English
2. Tamil

Design the implementation so that additional Indian languages can be added easily in the future.

Use proper Tamil Unicode characters and ensure that Tamil text renders correctly across all supported screens.

==================================================
2. LANGUAGE SELECTION
==================================================

Create a language selection feature.

Requirements:

- Add a language selection option in the Settings/Profile screen.
- Display the available languages with their native names.

Example:

English
தமிழ் (Tamil)

- Allow students to change their preferred language at any time.
- Update the application's interface immediately when the language changes.
- Save the selected language preference.
- Restore the previously selected language when the student reopens the application.
- Provide a suitable default language for first-time users.
- If a translation is unavailable, display the English fallback text instead of showing blank content or translation keys.

==================================================
3. TRANSLATE THE ENTIRE APPLICATION UI
==================================================

Implement translations throughout all existing EduPath screens.

Translate:

- Login and phone OTP authentication screens
- Student registration and profile screens
- Personal information and marks entry forms
- Community/category selection
- TNEA cutoff calculator
- College recommendations
- Branch recommendations
- Admission prediction results
- College comparison screen
- AI Counsellor interface
- Counselling report screen
- Notifications
- Settings
- Buttons, labels, menus, headings, placeholders, and error messages
- Loading messages, success messages, and validation messages

Do not translate only the home screen.

All screens must consistently follow the selected language.

==================================================
4. IMPLEMENT A CENTRALIZED TRANSLATION SYSTEM
==================================================

Create a centralized internationalization (i18n) structure.

For example:

- src/i18n/
- src/i18n/locales/en.json
- src/i18n/locales/ta.json
- src/i18n/index.ts

Use a suitable internationalization library compatible with the existing React Native and Expo project.

Requirements:

- Store translations separately from UI components.
- Avoid hardcoding user-visible English strings inside components.
- Use translation keys consistently.
- Support reusable translations across screens.
- Support interpolation for dynamic values such as student names, cutoff marks, college names, and admission prediction results.
- Maintain a fallback language.
- Keep the translation structure easy to maintain and extend.

Example:

{
  "home": {
    "welcome": "Welcome to EduPath",
    "recommendations": "College Recommendations",
    "admissionPrediction": "Admission Prediction"
  }
}

Provide equivalent Tamil translations.

==================================================
5. MULTILINGUAL AI COUNSELLOR
==================================================

Integrate multilingual support into the existing RAG-based AI Counsellor.

The existing AI Counsellor uses the current LangChain, ChromaDB, and LLM integration.

Do not replace the existing RAG architecture unnecessarily.

Requirements:

- Allow students to communicate with the AI Counsellor in English or Tamil.
- Automatically identify the language of the student's question when appropriate.
- Alternatively, use the student's selected language preference.
- Generate counselling responses in the student's preferred language.
- If the student asks a question in Tamil, respond naturally in Tamil.
- If the student asks a question in English, respond in English.
- Maintain the existing RAG retrieval workflow.
- Retrieve relevant TNEA knowledge before generating factual counselling answers.
- Preserve the original meaning of retrieved information.
- Use clear, student-friendly language.
- Support Tamil and English in the chat interface.
- Ensure that changing the application language updates the default counselling response language.

IMPORTANT AI COUNSELLING RULES:

- Do not invent TNEA cutoff marks, admission probabilities, deadlines, seat availability, or official counselling information.
- Do not translate college names, branch codes, official category names, or other identifiers in a way that changes their meaning.
- Keep numerical values, cutoff marks, years, college codes, and branch codes unchanged.
- If reliable information is unavailable in the knowledge base, clearly communicate that limitation.
- Do not claim that admission is guaranteed.

==================================================
6. VOICE-BASED MULTILINGUAL COUNSELLING
==================================================

If compatible voice capabilities are already available in the project, extend them to support Tamil and English.

Requirements:

- Allow students to ask counselling questions using voice.
- Support Tamil speech input where the selected speech recognition provider supports it.
- Support English speech input.
- Convert recognized speech into text and send it through the existing RAG counselling workflow.
- Provide spoken responses when text-to-speech is supported.
- Use the appropriate language and voice configuration for the selected language.
- Provide a text-based fallback if speech recognition or speech synthesis is unavailable.
- Display meaningful error messages when microphone permission is denied or voice processing fails.

Do not pretend that Tamil voice recognition is supported unless the selected provider actually supports it.

==================================================
7. MULTILINGUAL REPORTS AND NOTIFICATIONS
==================================================

Counselling reports:

- Generate report headings and descriptions in the student's selected language.
- Support English and Tamil report content.
- Preserve college names, branch names, cutoff marks, prediction values, and other important data accurately.
- Ensure Tamil Unicode characters render correctly in generated PDF reports.
- Use a Tamil-compatible font when generating Tamil PDFs.

Notifications:

- Display application notifications in the selected language wherever possible.
- Translate notification titles, descriptions, reminders, and system messages.
- Preserve important dates, times, numbers, and official identifiers.

==================================================
8. DATA STORAGE AND USER PREFERENCES
==================================================

Store the selected language preference appropriately using the existing application architecture.

Requirements:

- Associate the language preference with the authenticated student account when appropriate.
- Persist the preference using the existing database and API structure.
- Restore the preference after login.
- Ensure the preference remains consistent across application sessions.
- Do not overwrite marks, profile details, preferences, cutoff data, or admission prediction records when changing the language.

==================================================
9. USER EXPERIENCE AND DESIGN
==================================================

Maintain the existing EduPath UI design.

Requirements:

- Make the language selector simple and user-friendly.
- Ensure Tamil text does not overflow buttons, cards, forms, or navigation menus.
- Support different text lengths between English and Tamil.
- Use appropriate spacing, line heights, and font sizes.
- Maintain responsive layouts.
- Avoid unnecessary redesign of existing screens.
- Preserve all current navigation and animations.
- Show a loading indicator only when language resources genuinely require loading.

==================================================
10. TECHNICAL IMPLEMENTATION
==================================================

Before implementation:

1. Inspect the existing project structure.
2. Identify the current navigation, state management, API, authentication, and database architecture.
3. Identify the existing AI Counsellor and RAG implementation.
4. Reuse existing components and services wherever possible.
5. Choose an i18n library compatible with the current project dependencies.
6. Avoid introducing unnecessary libraries or duplicate services.

Then implement the feature across the application.

Ensure:

- TypeScript types are maintained.
- Existing API contracts are preserved unless changes are necessary.
- No existing feature is removed.
- No authentication configuration is broken.
- No existing database records are lost.
- No API keys or secrets are exposed in the mobile application.
- All required environment variables are documented.
- Existing error handling is preserved and improved where necessary.

==================================================
11. TESTING AND VERIFICATION
==================================================

Test the following scenarios:

1. First-time student opens the application.
2. Student selects English.
3. Student switches from English to Tamil.
4. All screens update to Tamil.
5. Student closes and reopens the application.
6. The selected language is restored.
7. Student logs out and logs in again.
8. The language preference is restored correctly.
9. Student asks the AI Counsellor a question in Tamil.
10. The AI Counsellor responds in Tamil using relevant retrieved knowledge.
11. Student asks a question in English.
12. The AI Counsellor responds in English.
13. Student generates a counselling report in Tamil.
14. Tamil characters display correctly in the PDF.
15. Missing translations use the configured fallback language.
16. Existing admission prediction and recommendation features continue working.
17. Existing phone OTP authentication continues working.

Fix any errors discovered during testing.

==================================================
12. FINAL DELIVERABLES
==================================================

After implementation, provide:

1. A summary of the multilingual features implemented.
2. The list of files created and modified.
3. Any dependencies added.
4. Any database or API changes required.
5. Environment variables or configuration steps required.
6. Instructions to run and test the application.
7. Any unsupported language or voice capabilities that still require additional services.

FINAL REQUIREMENT:

Implement this feature directly within the existing EduPath application.

The final result must provide a consistent English and Tamil experience across the application, including student screens, admission predictions, college recommendations, AI counselling, notifications, and counselling reports.

Do not stop after creating a language selector or translation files. Complete the integration across all relevant screens and verify that the existing application continues to work.