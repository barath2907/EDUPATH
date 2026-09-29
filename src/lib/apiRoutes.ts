/**
 * EduPath — Standardized TNEA REST / Service Layer API Routes
 * Exposes the universal backend client (EduPathAPI) backed by /api/* endpoints
 * and in-app dispatcher with session token management.
 */

import { EduPathAPI as UniversalAPI } from "./apiClient";

export { EduPathAPI as apiClient } from "./apiClient";
export const EduPathAPI = UniversalAPI;
export default UniversalAPI;
