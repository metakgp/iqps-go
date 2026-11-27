import { describe, expect, it } from "vitest";
import { extractDetailsFromText } from "../parseQPText";
import { validateCourseCode } from "../validateInput";
import { examLabel, getDepartment, semesterLabel } from "../institute";

describe("extractDetailsFromText (IIT Bhilai headers)", () => {
	it("reads a typical end-sem header", () => {
		const text = `INDIAN INSTITUTE OF TECHNOLOGY BHILAI
End-Semester Examination, Monsoon Semester 2023-24
Course: CSL101 Data Structures
Date: 24/11/2023      Max. Marks: 100      Time: 3 hrs`;
		expect(extractDetailsFromText(text)).toEqual({
			course_code: "CSL101", year: 2023, exam: "endsem", semester: "autumn", note: null,
		});
	});

	it("uses the second year for Winter semester", () => {
		const text = `IIT Bhilai\nMid Semester Exam - Winter 2024-25\nMAL 201 Linear Algebra`;
		const d = extractDetailsFromText(text);
		expect(d.course_code).toBe("MAL201");
		expect(d.exam).toBe("midsem");
		expect(d.semester).toBe("spring");
		expect(d.year).toBe(2025);
	});

	it("detects quizzes with numbers and roman numerals", () => {
		expect(extractDetailsFromText("EEL302 Quiz 2 Monsoon 2022").exam).toBe("ct2");
		expect(extractDetailsFromText("EEL302 QUIZ-II 2022").exam).toBe("ct2");
		expect(extractDetailsFromText("EEL302 Quiz I 2022").exam).toBe("ct1");
	});

	it("infers semester from the exam date when not written", () => {
		const d = extractDetailsFromText("DSL401 End Sem Exam\nDate: 05-05-2025");
		expect(d.semester).toBe("spring");
		expect(d.year).toBe(2025);
		const d2 = extractDetailsFromText("PHL101 Mid Sem\n18 September 2024");
		expect(d2.semester).toBe("autumn");
		expect(d2.year).toBe(2024);
	});

	it("ignores 'Max Marks 100' and fixes OCR O/0 mix-ups", () => {
		expect(extractDetailsFromText("Max 100 Marks\nCSL2O1 End Sem").course_code).toBe("CSL201");
		expect(extractDetailsFromText("MM 50   Time 2hrs").course_code).toBeNull();
	});

	it("marks supplementary exams in the note", () => {
		expect(extractDetailsFromText("Supplementary Examination CSL101 2024").note).toBe("Supplementary");
	});

	it("parses filenames", () => {
		const d = extractDetailsFromText("csl101_endsem_2024");
		expect(d.course_code).toBe("CSL101");
		expect(d.exam).toBe("endsem");
		expect(d.year).toBe(2024);
	});

	it("rejects years before IIT Bhilai existed or in the future", () => {
		expect(extractDetailsFromText("CSL101 End Sem 2012").year).toBeNull();
		expect(extractDetailsFromText(`CSL101 End Sem ${new Date().getFullYear() + 1}`).year).toBeNull();
	});
});

describe("institute helpers", () => {
	it("validates IIT Bhilai course codes", () => {
		expect(validateCourseCode("CSL101")).toBe(true);
		expect(validateCourseCode("ma201")).toBe(true);
		expect(validateCourseCode("CS10001")).toBe(false);
		expect(validateCourseCode("CSL1011")).toBe(false);
	});

	it("maps labels and departments", () => {
		expect(semesterLabel("autumn")).toBe("Monsoon");
		expect(semesterLabel("spring")).toBe("Winter");
		expect(examLabel("ct1")).toBe("Quiz 1");
		expect(examLabel("endsem")).toBe("End-Sem");
		expect(getDepartment("CSL101")).toBe("CSE");
		expect(getDepartment("DSL401")).toBe("DSAI");
		expect(getDepartment("MAL201")).toBe("Mathematics");
	});
});
