/**
 * IIT Bhilai specific configuration.
 *
 * Internally the app keeps IQPS's original values so the backend and database
 * stay unchanged (and upstream MetaKGP updates are easy to merge):
 *   semester: `autumn` = Monsoon (Jul–Dec), `spring` = Winter (Jan–May)
 *   exam:     `midsem`, `endsem`, `ct1` = Quiz 1, `ct2` = Quiz 2
 *   Supplementary exams are stored in the `note` field as "Supplementary".
 * Only what students SEE is changed, via the helpers below.
 */
import { Exam, Semester } from "../types/question_paper";

export const INSTITUTE_NAME = "IIT Bhilai";
export const SITE_NAME = "PYQ Portal - IIT Bhilai";
export const REPO_URL = import.meta.env.VITE_REPO_URL || "https://github.com/metakgp/iqps-go";

/** Max upload size in MB. Keep in sync with FILE_SIZE_LIMIT in backend/src/routing/handlers.rs */
export const MAX_FILE_SIZE_MB = 15;

/** IIT Bhilai course codes: 2–3 letters + 3 digits, e.g. CSL101, MAL201, EEL302, DSL401 */
export const COURSE_CODE_REGEX = /^[A-Z]{2,3}\d{3}$/;
/** Finds a course code inside text, allowing an optional space/hyphen ("CSL 101", "CSL-101"). */
export const COURSE_CODE_IN_TEXT_REGEX = /\b([A-Z]{2,3})[\s-]?(\d{3})\b/g;

/** Words that look like course codes on exam papers but are not (e.g. "MAX 100" marks). */
export const COURSE_CODE_FALSE_POSITIVES = new Set([
	"MAX", "MM", "MIN", "TOT", "ROOM", "NO", "PG", "PAGE", "SEC", "Q", "QN", "THE", "AND", "FOR", "DUR", "HRS", "BTECH", "MTECH",
]);

export const SEMESTER_LABELS: Record<Semester, string> = {
	autumn: "Monsoon",
	spring: "Winter",
};

export const semesterLabel = (sem: Semester | "") => (sem === "" ? "N/A" : SEMESTER_LABELS[sem] ?? sem);

/** Full name for an exam value, e.g. `ct1` -> "Quiz 1". */
export const examLabel = (exam: Exam | "") => {
	if (exam === "") return "Unknown";
	if (exam === "midsem") return "Mid-Sem";
	if (exam === "endsem") return "End-Sem";
	if (exam.startsWith("ct")) {
		const num = exam.slice(2);
		return num.length > 0 ? `Quiz ${num}` : "Quiz";
	}
	return exam;
};

/** Short tag for result cards, e.g. `ct2` -> "Q2". */
export const examTag = (exam: Exam | "") => {
	if (exam === "") return "?";
	if (exam === "midsem") return "MID";
	if (exam === "endsem") return "END";
	if (exam.startsWith("ct")) return `Q${exam.slice(2)}`;
	return exam.toUpperCase();
};

/**
 * Departments and the course-code prefixes that belong to them.
 * The department is derived from the course code, so it needs no database column.
 * TODO: verify these prefixes against the official IIT Bhilai course list and edit as needed.
 */
export const DEPARTMENTS: { name: string; prefixes: string[] }[] = [
	{ name: "CSE", prefixes: ["CS"] },
	{ name: "EE", prefixes: ["EE", "EC"] },
	{ name: "ME", prefixes: ["ME"] },
	{ name: "DSAI", prefixes: ["DS", "AI"] },
	{ name: "Physics", prefixes: ["PH"] },
	{ name: "Chemistry", prefixes: ["CY", "CH"] },
	{ name: "Mathematics", prefixes: ["MA"] },
	{ name: "Liberal Arts", prefixes: ["LA", "HS", "HU"] },
];

export const getDepartment = (courseCode: string): string | null => {
	const code = courseCode.toUpperCase();
	const dept = DEPARTMENTS.find((d) => d.prefixes.some((p) => code.startsWith(p)));
	return dept ? dept.name : null;
};

export const normalizeCourseCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, "");
