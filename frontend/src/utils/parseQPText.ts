/**
 * Pure (no browser APIs) parser that guesses question paper details from text.
 * The text comes from the PDF's first page (text layer or OCR) or from the filename.
 * Tuned for IIT Bhilai papers. Kept dependency-free so it can be unit tested with Node.
 */
import type { Exam, Semester } from "../types/question_paper";
import {
	COURSE_CODE_FALSE_POSITIVES,
	DEPARTMENTS,
} from "./institute";

export interface IExtractedDetails {
	course_code: string | null,
	year: number | null,
	exam: Exam | 'ct' | null,
	semester: Semester | null,
	note: string | null,
}

/** IIT Bhilai was established in 2016, so older years are certainly OCR noise. */
const MIN_YEAR = 2016;

const MONTHS: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const isPlausibleYear = (year: number) => year >= MIN_YEAR && year <= new Date().getFullYear();

/** Monsoon = July–December (`autumn`), Winter = January–June (`spring`). */
const semesterFromMonth = (month: number): Semester => (month >= 7 ? 'autumn' : 'spring');

function extractCourseCode(text: string): string | null {
	const upper = text.toUpperCase();
	const knownPrefixes = DEPARTMENTS.flatMap((d) => d.prefixes);

	// Digits part also accepts O/I/L which OCR often produces instead of 0/1 (eg: "CSL1O1").
	const regex = /(?<![A-Z0-9])([A-Z]{2,3})[\s-]?([0-9OIL]{3})(?![A-Z0-9])/g;

	let best: { code: string, score: number, index: number } | null = null;

	for (const match of upper.matchAll(regex)) {
		const letters = match[1];
		const rawDigits = match[2];

		if (!/\d/.test(rawDigits)) continue; // eg: "SOIL" must not become a course code
		if (COURSE_CODE_FALSE_POSITIVES.has(letters)) continue;

		const digits = rawDigits.replace(/O/g, '0').replace(/[IL]/g, '1');
		const code = letters + digits;

		let score = 0;
		if (knownPrefixes.some((p) => letters.startsWith(p))) score += 2;
		if (letters.length === 3 && /[LPD]$/.test(letters)) score += 1; // eg: CSL (lecture), EEP (practical)
		if (!/\s|-/.test(match[0])) score += 0.5; // written together, eg: CSL101

		const index = match.index ?? 0;
		if (best === null || score > best.score) best = { code, score, index };
	}

	return best ? best.code : null;
}

function extractExam(lower: string): IExtractedDetails['exam'] {
	const patterns: [RegExp, (m: RegExpMatchArray) => IExtractedDetails['exam']][] = [
		[/\bquiz[\s\-–#:]*(1|2|3|i{1,3}|one|two|three)?\b/, (m) => {
			const num = m[1];
			if (!num) return 'ct';
			const map: Record<string, string> = { i: '1', ii: '2', iii: '3', one: '1', two: '2', three: '3' };
			return `ct${map[num] ?? num}` as Exam;
		}],
		[/\bclass[\s-]*test[\s\-–#:]*(\d)?/, (m) => (m[1] ? `ct${m[1]}` as Exam : 'ct')],
		[/\bmid[\s-]*(sem|term)|\bminor\s+exam/, () => 'midsem'],
		[/\bend[\s-]*(sem|term)|\bmajor\s+exam|\bfinal\s+exam/, () => 'endsem'],
	];

	// Pick whichever exam keyword appears first in the header.
	let found: { index: number, exam: IExtractedDetails['exam'] } | null = null;
	for (const [regex, toExam] of patterns) {
		const match = lower.match(regex);
		if (match && match.index !== undefined && (found === null || match.index < found.index)) {
			found = { index: match.index, exam: toExam(match) };
		}
	}

	return found ? found.exam : null;
}

function extractSemester(lower: string): Semester | null {
	const monsoon = lower.search(/\b(monsoon|autumn|odd\s+sem)/);
	const winter = lower.search(/\b(winter|spring|even\s+sem)/);

	if (monsoon === -1 && winter === -1) return null;
	if (winter === -1) return 'autumn';
	if (monsoon === -1) return 'spring';
	return monsoon < winter ? 'autumn' : 'spring';
}

/** Finds an exam date like 12/09/2023, 12-09-2023, 12.09.23 or "12 September 2023". */
function extractDate(lower: string): { month: number, year: number } | null {
	const numeric = lower.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})\b/);
	if (numeric) {
		const month = Number(numeric[2]);
		const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
		if (month >= 1 && month <= 12 && isPlausibleYear(year)) return { month, year };
	}

	const named = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[.,]?\s*(?:\d{1,2}(?:st|nd|rd|th)?,?\s*)?(20\d{2})\b/);
	if (named) {
		const year = Number(named[2]);
		if (isPlausibleYear(year)) return { month: MONTHS[named[1]], year };
	}

	return null;
}

function extractYear(lower: string, semester: Semester | null, date: { year: number } | null): number | null {
	// Academic year, eg: 2023-24 or 2023-2024. Monsoon is in the first year, Winter in the second.
	const academic = lower.match(/(?<!\d)(20\d{2})\s*[-–/]\s*(20\d{2}|\d{2})(?!\d)/);
	if (academic && semester !== null) {
		const first = Number(academic[1]);
		const second = academic[2].length === 4 ? Number(academic[2]) : Number(academic[1].slice(0, 2) + academic[2]);
		if (second === first + 1) {
			const year = semester === 'autumn' ? first : second;
			if (isPlausibleYear(year)) return year;
		}
	}

	// An exam date is the most reliable source.
	if (date) return date.year;

	for (const match of lower.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)) {
		const year = Number(match[1]);
		if (isPlausibleYear(year)) return year;
	}

	return null;
}

export function extractDetailsFromText(text: string): IExtractedDetails {
	// Only the header matters; the rest of the page is questions.
	const header = text.split('\n').slice(0, 15).join('\n');
	const lower = header.toLowerCase().replace(/_/g, ' ');

	const date = extractDate(lower);
	const semester = extractSemester(lower) ?? (date ? semesterFromMonth(date.month) : null);
	const year = extractYear(lower, semester, date);

	let note: string | null = null;
	if (/supplementary|\bsupple\b|re-?exam|make-?up\s+exam/.test(lower)) note = 'Supplementary';

	return {
		course_code: extractCourseCode(header.replace(/_/g, ' ')),
		year,
		exam: extractExam(lower),
		semester,
		note,
	};
}
