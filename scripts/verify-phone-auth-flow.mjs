/**
 * EduPath Verification Script: Persistent Phone Authentication & Profile System
 * Rule: ONE PHONE NUMBER = ONE PERSISTENT STUDENT ACCOUNT
 */

// Simple in-memory localStorage polyfill for node testing
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

function normalizePhone(rawPhone, countryCode = "+91") {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91") && countryCode === "+91") {
    return `+${digits}`;
  }
  const last10 = digits.slice(-10);
  return `${countryCode}${last10}`;
}

const REGISTRY_STORAGE_KEY = "edupath_students_master_v1";
const ACTIVE_PHONE_KEY = "edupath_active_student_phone";

function getRegistry() {
  const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveRegistry(reg) {
  localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(reg));
}

function searchStudentByPhone(phone) {
  const reg = getRegistry();
  const acc = reg[phone] || null;
  if (acc && acc.profile && acc.profile.profile_complete) {
    return { exists: true, account: acc };
  }
  return { exists: false, account: null };
}

function createStudentAccount(phone, profileData, academicData) {
  const digits = phone.replace(/\D/g, "");
  const userId = `student_${digits}`;
  const now = new Date().toISOString();

  const profile = {
    id: `prof_${digits}`,
    user_id: userId,
    phone,
    display_name: profileData.displayName,
    dob: profileData.dob || null,
    school: profileData.school || null,
    passing_year: profileData.passingYear || "2024",
    category: profileData.category,
    preferred_district: profileData.preferredDistrict,
    preferred_branches: profileData.preferredBranches,
    budget: profileData.budget,
    language: profileData.language || "English",
    is_government_school_quota: !!profileData.isGovernmentSchoolQuota,
    is_first_graduate: !!profileData.isFirstGraduate,
    special_reservation: profileData.specialReservation || null,
    comparison_codes: ["0001", "2006", "2005"],
    profile_complete: true,
    created_at: now,
    updated_at: now,
  };

  let academicRecord = null;
  if (academicData) {
    academicRecord = {
      id: `acad_${digits}`,
      user_id: userId,
      phone,
      maths: academicData.maths,
      physics: academicData.physics,
      chemistry: academicData.chemistry,
      cutoff: academicData.cutoff,
      category: profileData.category,
      academic_year: academicData.academicYear || "2024",
      source: "registration",
      confirmed: true,
      created_at: now,
    };
  }

  const completeAccount = {
    profile,
    academicRecord,
    savedColleges: [],
    comparisonCodes: ["0001", "2006", "2005"],
    counsellingHistory: [],
  };

  const reg = getRegistry();
  reg[phone] = completeAccount;
  saveRegistry(reg);
  localStorage.setItem(ACTIVE_PHONE_KEY, phone);

  return completeAccount;
}

function toggleSavedCollege(phone, item) {
  const reg = getRegistry();
  const acc = reg[phone];
  const idx = acc.savedColleges.findIndex(c => c.college_code === item.college_code);
  if (idx >= 0) {
    acc.savedColleges.splice(idx, 1);
  } else {
    acc.savedColleges.push(item);
  }
  saveRegistry(reg);
  return acc.savedColleges;
}

function addCounsellingMessage(phone, msg) {
  const reg = getRegistry();
  const acc = reg[phone];
  acc.counsellingHistory.push(msg);
  saveRegistry(reg);
  return acc.counsellingHistory;
}

async function runTests() {
  console.log("=== STARTING EDUPATH PERSISTENT PHONE AUTH & PROFILE TEST ===");

  // Test 1: Phone Normalization
  console.log("\n[Test 1] Testing Phone Normalization...");
  const p1 = normalizePhone("9876543210", "+91");
  const p2 = normalizePhone("+91 98765 43210", "+91");
  const p3 = normalizePhone("919876543210", "+91");
  if (p1 === "+919876543210" && p2 === "+919876543210" && p3 === "+919876543210") {
    console.log("✓ PASS: All variations normalize to +919876543210");
  } else {
    throw new Error(`Phone normalization failed: p1=${p1}, p2=${p2}, p3=${p3}`);
  }

  // Test 2: New Student Check
  console.log("\n[Test 2] Checking for un-registered phone...");
  const check1 = searchStudentByPhone("+919876543210");
  if (!check1.exists && check1.account === null) {
    console.log("✓ PASS: Correctly identified as NEW USER");
  } else {
    throw new Error("Phone should not exist yet");
  }

  // Test 3: New User Registration & Profile Creation
  console.log("\n[Test 3] Creating new student account...");
  const newAccount = createStudentAccount(
    "+919876543210",
    {
      displayName: "Karthik Subramanian",
      dob: "2006-05-14",
      category: "BC",
      school: "Government Higher Secondary School, Coimbatore",
      passingYear: "2024",
      preferredDistrict: "Coimbatore",
      preferredBranches: ["CS", "EC", "IT"],
      budget: 65000,
      isGovernmentSchoolQuota: true,
      isFirstGraduate: true,
      specialReservation: "None",
    },
    {
      maths: 98,
      physics: 92,
      chemistry: 94,
      cutoff: 191.0,
      academicYear: "2024",
    }
  );

  console.log(`✓ Created account for: ${newAccount.profile.display_name} (${newAccount.profile.phone})`);
  console.log(`  Cutoff: ${newAccount.academicRecord.cutoff} / 200 (Maths: 98, Physics: 92, Chemistry: 94)`);
  console.log(`  Category: ${newAccount.profile.category}, 7.5% Quota: ${newAccount.profile.is_government_school_quota}, First Graduate: ${newAccount.profile.is_first_graduate}`);

  // Test 4: Student Interactions (Bookmarks, AI Chat)
  console.log("\n[Test 4] Adding saved college and AI counselling message...");
  toggleSavedCollege("+919876543210", {
    college_code: "2006",
    college_name: "PSG College of Technology, Coimbatore",
    branch_code: "CS",
    branch_name: "Computer Science and Engineering",
    cutoff_2023: 195.5,
  });

  addCounsellingMessage("+919876543210", {
    role: "user",
    content: "What are my chances for PSG Tech CS with 191 cutoff under BC category?",
  });

  addCounsellingMessage("+919876543210", {
    role: "assistant",
    content: "With a cutoff of 191 in BC category and 7.5% Govt School Quota, PSG Tech CS is competitive but feasible under quota rounds.",
  });

  const updatedAcc = getRegistry()["+919876543210"];
  console.log(`✓ Saved Colleges count: ${updatedAcc.savedColleges.length}`);
  console.log(`✓ Counselling History messages: ${updatedAcc.counsellingHistory.length}`);

  // Test 5: Emulate Logout
  console.log("\n[Test 5] Logging out student...");
  localStorage.removeItem(ACTIVE_PHONE_KEY);
  if (localStorage.getItem(ACTIVE_PHONE_KEY) === null) {
    console.log("✓ PASS: Session terminated cleanly upon logout");
  }

  // Test 6: EXISTING USER FLOW
  console.log("\n[Test 6] Existing User logs in again with phone 98765 43210...");
  const loginPhone = normalizePhone("98765 43210", "+91");
  const existingCheck = searchStudentByPhone(loginPhone);

  if (existingCheck.exists && existingCheck.account) {
    console.log("✓ PASS: Database identified phone as EXISTING USER!");
    const restored = existingCheck.account;
    console.log(`✓ Restored Profile: Name = "${restored.profile.display_name}", Category = "${restored.profile.category}"`);
    console.log(`✓ Restored DOB: ${restored.profile.dob}`);
    console.log(`✓ Restored Quotas: 7.5% TN Govt = ${restored.profile.is_government_school_quota}, First Graduate = ${restored.profile.is_first_graduate}`);
    console.log(`✓ Restored Cutoff: ${restored.academicRecord.cutoff} (Maths: ${restored.academicRecord.maths}, Physics: ${restored.academicRecord.physics}, Chemistry: ${restored.academicRecord.chemistry})`);
    console.log(`✓ Restored Saved Colleges: ${restored.savedColleges.map(c => c.college_name).join(", ")}`);
    console.log(`✓ Restored AI Counsellor Chat: ${restored.counsellingHistory.length} messages`);
    
    if (
      restored.profile.display_name === "Karthik Subramanian" &&
      restored.academicRecord.cutoff === 191.0 &&
      restored.savedColleges.length === 1 &&
      restored.counsellingHistory.length === 2
    ) {
      console.log("\n=======================================================");
      console.log("🎉 ALL TESTS PASSED: ONE PHONE NUMBER = ONE PERSISTENT ACCOUNT");
      console.log("=======================================================");
    } else {
      throw new Error("Data mismatch in restored profile!");
    }
  } else {
    throw new Error("Failed to detect existing student account!");
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
