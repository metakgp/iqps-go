import COURSE_CODE_MAP from "../data/courses.json";
import { Exam, IQuestionPaper, IQuestionPaperFile, Semester } from "../types/question_paper";
import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { validateCourseCode, validateExam, validateSemester, validateYear } from "./validateInput";

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

export function getCourseFromCode<K extends keyof typeof COURSE_CODE_MAP>(code: string): typeof COURSE_CODE_MAP[K] | null {
    if (code.toUpperCase() in COURSE_CODE_MAP) {
        return COURSE_CODE_MAP[code.toUpperCase() as keyof typeof COURSE_CODE_MAP];
    } else {
        return null;
    }
};

export function getCodeFromCourse<K extends keyof typeof COURSE_CODE_MAP>(course: string): K | null {
    const index = Object.values(COURSE_CODE_MAP).indexOf(course);

    if (index !== -1) {
        return Object.keys(COURSE_CODE_MAP)[index] as K;
    } else {
        return null;
    }
};

export interface IExtractedDetails {
    course_code: string | null,
    year: number | null,
    exam: Exam | 'ct' | null,
    semester: Semester | null,
    note: string | null,
}

export function extractDetailsFromText(text: string): IExtractedDetails {
    // Extract the first 10 lines
    const lines = text.split('\n').slice(0, 10).join('\n');

    const courseCodeMatch = lines.match(/[^\w]*([A-Z]{2}\d{5})[^\w]*/);
    const courseCodeMatchWithSpace = lines.match(/[^\w]*([A-Z]{2}\s*\d{5})[^\w]*/); // Match course codes written as XX XXXXX

    const courseCode = (
        courseCodeMatch ? courseCodeMatch[1].toUpperCase() :
            (
                courseCodeMatchWithSpace ?
                    courseCodeMatchWithSpace[1].replace(/\s*/g, '').toUpperCase() : null
            )
    );

    const examTypeMatch = lines.match(/[^\w]*(Mid|End|Class Test)[^\w]*/i);
    const examTypeMatchStr = examTypeMatch ? examTypeMatch[1].toLowerCase() : null;
    const examType = <IExtractedDetails['exam']>(
        examTypeMatchStr ? (
            (examTypeMatchStr == 'mid' || examTypeMatchStr == 'end') ?
                examTypeMatchStr + 'sem'
                : examTypeMatchStr === 'class test' ?
                    'ct' : null
        ) : null
    );

    const semesterMatch = lines.match(/[^\w]*(spring|autumn)[^\w]*/i);
    const semester = semesterMatch ? semesterMatch[1].toLowerCase() as Semester : null;

    let year: number | null = null;

    if (semester === null) {
        // Matches any string of the format 2xxx (matches any year)
        const yearMatch = lines.match(/([^\d]|^)(2\d{3})([^\d]|$)/); // Someone change this in the year 3000
        year = yearMatch ? Number(yearMatch[0]) : null;
    } else {
        // If semester is known, match any string of the format 2xxx-2xxx or 2xxx-xx and select the first or second based on semester
        const yearMatch = lines.match(/([^\d]|^)(2[\d]{3})-(2[\d]{3}|[\d]{2})([^\d]|$)/) // Someone change this in the year 3000

        if (yearMatch) {
            if (semester === 'autumn') year = Number(yearMatch[2]);
            else {
                year = Number(
                    yearMatch[3].length === 4 ?
                    yearMatch[3] :
                    (yearMatch[2].slice(0, 2) + yearMatch[3])
                );
            }
        } else year = null;
    }

    let note = null;
    if (lines.toLowerCase().includes('supplementary')) note = 'Supplementary';
    else {
        const slotMatch = lines.match(/[^\w]*slot\s+([a-z])[^\w]*/i);
        if (slotMatch) {
            note = `Slot ${slotMatch[1].toUpperCase()}`;
        }
    }

    return {
        course_code: courseCode,
        year,
        exam: examType,
        semester,
        note
    };
}

export async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);

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
    const semester = filenameOrPdfFallback(filenameSemester, pdfSemester, validateSemester, new Date().getMonth() > 7 ? "autumn" : "spring");
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
