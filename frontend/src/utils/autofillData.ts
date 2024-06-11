import COURSE_CODE_MAP from "../data/courses.json";
import { Exam, IQuestionPaper, IQuestionPaperFile, Semester } from "../types/types";
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { validate, validateCourseCode } from "./validateInput";

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
    const examType = examTypeMatch ? examTypeMatch[1] : 'Unknown';

    return {
        courseCode,
        year,
        examType
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

async function getAutofillDataFromPDF(file: File): Promise<{ courseCode: string, year: string, examType: string }> {
    const text = await extractTextFromPDF(file);

    const { courseCode, year, examType } = extractDetailsFromText(text);
    return { courseCode, year, examType };
}

export const autofillData = async (
    filename: string, file: File,
): Promise<IQuestionPaper> => {
    try {
        const { courseCode, year, examType } = await getAutofillDataFromPDF(file);

        if (!validateCourseCode(courseCode)) {
            throw 'Invalid course code detected. Trying from filename.'
        }

        const qpDetails: IQuestionPaper = {
            course_code: courseCode,
            year: Number(year),
            exam: (examType.toLowerCase() + "sem") as Exam,
            semester: new Date().getMonth() > 7 ? "autumn" : "spring",
            course_name: getCourseFromCode(courseCode) ?? "Unknown Course",
        };

        return qpDetails;

    } catch (error) {
        console.error('Error autofilling data:', error);
        // Split filename at underscores
        const dotIndex = filename.lastIndexOf(".");
        const filenameparts = filename.substring(0, dotIndex).split("_");

        const [course_code, year, exam, semester] = filenameparts;

        const qpDetails: IQuestionPaper = {
            course_code,
            year: new Date().getFullYear(),
            exam: "midsem",
            semester: new Date().getMonth() > 7 ? "autumn" : "spring",
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

