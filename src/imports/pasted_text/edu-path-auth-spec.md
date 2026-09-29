**ROLE:** Act as a Senior Full-Stack Developer, Supabase Authentication Specialist, and Software Architect.

**PROJECT:** EduPath – AI-Powered TNEA College Admission and Counselling Mobile Application.

### OBJECTIVE

Fix the existing phone number login system. Real-time SMS OTP authentication is currently not working reliably. Implement a Mock OTP login system for development and demonstration purposes while maintaining secure user identification and strict student profile isolation.

### REQUIREMENTS

**1. Phone Number Login**

* Allow students to enter their mobile phone numbers.
* Normalize phone numbers consistently, including the appropriate country code.
* Generate a fresh, random six-digit Mock OTP for every OTP request.
* Display the OTP on the verification screen in development/demo mode.
* Verify the OTP before allowing login.
* Reject incorrect, expired, or previously used OTPs.
* Include a resend OTP option with appropriate cooldown and rate limiting.

**2. Student Authentication**

* Integrate the login flow with the existing EduPath authentication architecture.
* Do not treat frontend-only OTP verification as secure production authentication.
* Use a trusted backend verification process to validate OTPs.
* Establish a proper authenticated user identity after successful verification.
* Preserve compatibility with the existing application and avoid unnecessary architectural changes.

**3. Supabase Student Profiles**

* Store each student's profile in the Supabase database.
* Associate each profile with a unique authenticated user ID.
* Enforce uniqueness for normalized phone numbers.
* When a new student logs in, create a profile only if one does not already exist.
* When an existing student logs in, retrieve and display their existing profile.
* Never create duplicate profiles for the same authenticated student.

**4. Strict Profile Isolation**

* Ensure Student A can access only Student A's profile.
* Ensure Student B can access only Student B's profile.
* Never retrieve profiles using an unfiltered database query.
* Use the authenticated user ID for profile lookups.
* Implement appropriate Supabase Row Level Security (RLS) policies.
* Do not trust user IDs supplied directly by the frontend.
* Prevent cached profile information from one student appearing in another student's session.

**5. EduPath Student Data**
Preserve each student's individual:

* Full name and phone number.
* Community and reservation-related details.
* TNEA cut-off marks.
* Preferred colleges and engineering branches.
* Preferred location and budget.
* Admission counselling preferences.
* College recommendations and counselling history, where applicable.

**6. Logout and Returning Login**

* Implement a proper logout process.
* Clear user-specific application state and cached profile data on logout.
* When the same student logs in again, retrieve the existing profile.
* When a different student logs in, load only that student's profile.
* Do not overwrite one student's data with another student's information.

**7. Production and Demo Separation**

* Make Mock OTP functionality available only in development/demo mode.
* Keep production authentication separate from Mock OTP authentication.
* Never expose Supabase service-role keys or other privileged secrets in frontend code.
* Clearly document how to switch between demo and production authentication.

### IMPLEMENTATION INSTRUCTIONS

1. First inspect the existing EduPath source code and project structure.
2. Identify the current authentication flow, routing, Supabase integration, and profile retrieval logic.
3. Explain the root cause of the existing login problem based on the actual code.
4. Modify the existing implementation instead of unnecessarily rebuilding the entire application.
5. Provide the complete updated code for every modified file.
6. Provide any required Supabase SQL migrations and RLS policies.
7. Include environment variable configuration without exposing secrets.
8. Explain how to run and test the implementation.
9. Verify the following scenarios:

   * First-time student login.
   * Returning student login.
   * Different OTPs for separate OTP requests.
   * Incorrect OTP rejection.
   * Expired OTP rejection.
   * Logout and login using the same phone number.
   * Logout and login using a different phone number.
   * Profile isolation between two students.
   * Prevention of duplicate student profiles.

### IMPORTANT CONSTRAINTS

* Do not remove existing EduPath features.
* Do not modify the TNEA admission prediction or college recommendation algorithms unnecessarily.
* Do not use hardcoded OTPs for all students.
* Do not identify students using phone numbers alone when a verified authenticated user ID is available.
* Do not claim the implementation is secure unless the authentication and database authorization mechanisms actually enforce the required protections.

**EXPECTED RESULT:** A working EduPath demo login system in which students can authenticate using Mock OTP, return to their existing profiles, and access only their own student data.
