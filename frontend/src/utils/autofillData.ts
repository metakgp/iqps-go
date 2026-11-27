import { COURSES } from "./courses";
import { IQuestionPaper, IQuestionPaperFile } from "../types/question_paper";
import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { validateCourseCode, validateExam, validateSemester, validateYear } from "./validateInput";
import { normalizeCourseCode } from "./institute";

// Set the pdfjs worker source
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export const sanitizeQP = async (qp: IQuestionPaperFile) => {
    const sanitizedFilename = qp.file.name
        .replace(/[^\w\d\_]/g, "-")
        .replace(/\$+/g, "$");

    return {
        ...qp,
        file_name: sanitizedFilename,
        file: qp.file,
    };
};

export function getCourseFromCode(code: string): string | null {
    return COURSES[normalizeCourseCode(code)] ?? null;
};

export function getCodeFromCourse(course: string): string | null {
    const entry = Object.entries(COURSES).find(([, name]) => name.toLowerCase() === course.trim().toLowerCase());
    return entry ? entry[0] : null;
};

import { extractDetailsFromText, IExtractedDetails } from "./parseQPText";
export { extractDetailsFromText };
export type { IExtractedDetails };

/**
 * Gets the text of the first page.
 * Uses the PDF's own text layer when it has one (fast, accurate, no download),
 * and falls back to OCR with Tesseract for scanned papers.
 */
export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);

    const content = await page.getTextContent();
    const layerText = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('');

    if (layerText.replace(/\s/g, '').length >= 40) return layerText;

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imageData = canvas.toDataURL('image/png');

    const { data: { text } } = await Tesseract.recognize(imageData, 'eng');

    return text;
}

async function getAutofillDataFromPDF(file: File): Promise<IExtractedDetails> {
    try {
        const pdfData = await file.arrayBuffer();
        const text = await extractTextFromPDF(pdfData);

        return extractDetailsFromText(text);
    } catch (e) {
        console.log("Error extracting details from PDF: ", e);

        return {
            course_code: null,
            year: null,
            exam: null,
            semester: null,
            note: null
        }
    }
}

export const autofillData = async (
    filename: string, file: File,
): Promise<IQuestionPaper> => {
    // Try to extract details from the PDF
    const { course_code: pdfCourseCode, year: pdfYear, exam: pdfExam, semester: pdfSemester, note: pdfNote } = await getAutofillDataFromPDF(file);
    // Try to extract details from the filename
    const dotIndex = filename.lastIndexOf("."); // Split the filename at the last `.`, ie, remove the extension
    const { course_code: filenameCourseCode, year: filenameYear, exam: filenameExam, semester: filenameSemester, note: filenameNote } = extractDetailsFromText(filename.substring(0, dotIndex));

    const filenameOrPdfFallback = <T>(
        filenameData: T | null,
        pdfData: T | null,
        validator: (data: T) => boolean,
        fallback: T
    ): T => {
        return filenameData !== null && validator(filenameData) ?
            filenameData :
            pdfData !== null && validator(pdfData) ?
                pdfData : fallback;
    }

    const course_code = filenameOrPdfFallback(filenameCourseCode, pdfCourseCode, validateCourseCode, 'Unknown Course');
    const year = filenameOrPdfFallback(filenameYear, pdfYear, validateYear, new Date().getFullYear());
    const exam = filenameOrPdfFallback(filenameExam, pdfExam, validateExam, '');
    const semester = filenameOrPdfFallback(filenameSemester, pdfSemester, validateSemester, new Date().getMonth() >= 6 ? "autumn" : "spring" /* Jul–Dec = Monsoon */);
    const note = filenameOrPdfFallback(filenameNote, pdfNote, (note) => note !== null, '');

    const qpDetails: IQuestionPaper = {
        course_code,
        year,
        exam,
        semester,
        course_name: getCourseFromCode(course_code) ?? "Unknown Course",
        note,
    };

    return qpDetails;
};
