import COURSE_CODE_MAP from "../data/courses.json";
import { Exam, IQuestionPaper, IQuestionPaperFile, Semester } from "../types/types";
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { validate, validateCourseCode, validateExam, validateSemester, validateYear } from "./validateInput";

// Access the worker source path from environment variables
const pdfWorkerSrc = import.meta.env.VITE_PDF_WORKER_SRC;

if (typeof pdfWorkerSrc === 'string') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
} else {
    console.error('PDF WORKER Error: Invalid workerSrc type:', pdfWorkerSrc);
}

export const sanitizeQP = async (qp: IQuestionPaperFile) => {
    const sanitizedCourseName = qp.course_name
        .replace(/[^\w\d\_]/g, "-")
        .replace(/\$+/g, "$");

    const sanitizedFilename = qp.file.name
        .replace(/[^\w\d\_]/g, "-")
        .replace(/\$+/g, "$");


    return {
        ...qp,
        course_name: sanitizedCourseName,
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

function extractDetailsFromText(text: string) {
    // Extract the first 10 lines
    const lines = text.split('\n').slice(0, 10).join('\n');

    const courseCodeMatch = lines.match(/[^\w]*([A-Z]{2}\d{5})[^\w]*/);
    const courseCode = courseCodeMatch ? courseCodeMatch[1] : 'Unknown Course';

    const yearMatch = lines.match(/[^\d]*(\d{4})[^\d]*/);
    const year = yearMatch ? yearMatch[1] : 'Unknown Year';

    const examTypeMatch = lines.match(/[^\w]*(Mid|End)[^\w]*/i);
    const examType = examTypeMatch ? examTypeMatch[1].toLowerCase() + "sem" : 'Unknown';

    const semesterMatch = lines.match(/[^\w]*(spring|autumn)[^\w]*/i);
    const semester = semesterMatch ? semesterMatch[1].toLowerCase() : 'Unknown';

    return {
        courseCode,
        year,
        examType,
        semester
    };
}


async function extractTextFromPDF(pdfFile: File): Promise<string> {
    const pdfData = await pdfFile.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
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

async function getAutofillDataFromPDF(file: File): Promise<{ courseCode: string, year: string, examType: string, semester: string }> {
    const text = await extractTextFromPDF(file);

    const { courseCode, year, examType, semester } = extractDetailsFromText(text);
    return { courseCode, year, examType, semester };
}

function extractDetailsFromFilename(filename: string): { course_code: string, year: string, exam: string, semester: string } {
    const courseCodeMatch = filename.match(/[A-Z]{2}\d{5}/i);
    const course_code = courseCodeMatch ? courseCodeMatch[1] : 'Unknown Course';

    const yearMatch = filename.match(/\d{4}/);
    const year = yearMatch ? yearMatch[1] : 'Unknown Year';

    const examMatch = filename.match(/(Mid|End)/i);
    const exam = examMatch ? examMatch[1].toLowerCase() + "sem" : 'Unknown';

    const semesterMatch = filename.match(/(spring|autumn)/i);
    const semester = semesterMatch ? semesterMatch[1].toLowerCase() : 'Unknown';

    return {
        course_code,
        year,
        exam,
        semester
    };
}

export const autofillData = async (
    filename: string, file: File,
): Promise<IQuestionPaper> => {
    try {
        const { courseCode, year, examType, semester } = await getAutofillDataFromPDF(file);
        const parsedYear = Number(year);

        if (!validateCourseCode(courseCode)) {
            throw {
                msg: 'Invalid course code detected. Trying from filename.',
                exam: validateExam(examType) ? examType : null,
                year: validateYear(parsedYear) ? parsedYear : null,
                semester: validateSemester(semester) ? semester : null
            }
        }

        const qpDetails: IQuestionPaper = {
            course_code: courseCode,
            year: Number(year),
            exam: examType as Exam,
            semester: validateSemester(semester) ? semester as Semester : (new Date().getMonth() > 7 ? "autumn" : "spring"),
            course_name: getCourseFromCode(courseCode) ?? "Unknown Course",
        };

        return qpDetails;

    } catch (error: any) {
        console.error('Error autofilling data:', error);
        // Try to extract course details from filename
        const dotIndex = filename.lastIndexOf("."); // Split the filename at the last `.`, ie, remove the extension
        const {course_code, year, exam, semester} = extractDetailsFromFilename(filename.substring(0, dotIndex));

        // Get the PDF-parsed exam and year details (if they exist)
        const pdfExam: Exam | null = 'exam' in error ? error.exam : null;
        const pdfYear: number | null = 'year' in error ? error.year : null;
        const pdfSemester: Semester | null = 'semester' in error ? error.semester : null;

        const qpDetails: IQuestionPaper = {
            course_code,
            year: validateYear(Number(year)) ? Number(year) : (pdfYear ?? new Date().getFullYear()),
            exam: validateExam(exam) ? exam as Exam : (pdfExam ?? "unknown"),
            semester: validateSemester(semester) ? semester as Semester : (pdfSemester ?? (new Date().getMonth() > 7 ? "autumn" : "spring")),
            course_name: getCourseFromCode(course_code) ?? "Unknown Course",
        }

        if (
            year &&
            year.length === 4 && // Someome will fix this in year 10000 if metaKGP and KGP still exist then. Until then, it will at least prevent lazy asses from writing 21 instead of 2021
            !isNaN(parseInt(year)) &&
            parseInt(year) <= new Date().getFullYear() // Imagine sending a question paper from the future, should we support this just in case? I mean metaKGP are pioneers in technology, shouldn't we support other pioneers on our system too?
        ) qpDetails.year = parseInt(year);

        if (exam && (exam.toLowerCase() === "midsem" || exam.toLowerCase() === "endsem")) qpDetails.exam = exam.toLowerCase() as Exam;

        if (semester && (semester.toLowerCase() === "spring" || semester.toLowerCase() === "autumn")) qpDetails.semester = semester.toLowerCase() as Semester;

        return qpDetails;
    }


};

