import COURSE_DATA from "../data/courses.json";

/**
 * IIT Bhilai course code -> course name map, used to auto-fill course names.
 * Generate `data/courses.json` from a CSV with `node scripts/csv-to-courses.mjs courses.csv`.
 */
export const COURSES: Record<string, string> = COURSE_DATA as Record<string, string>;
