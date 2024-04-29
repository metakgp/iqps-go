import { Component, createEffect } from "solid-js";
import { IErrorMessage, IQuestionPaperFile } from "../types/types";
import { getCourseFromCode } from "../utils/autofillData";
import toast from "solid-toast";
import { validate } from "../utils/validateInput";
import { createStore } from "solid-js/store";

type Props = {
    close: () => void;
    qPaper: IQuestionPaperFile;
    update: (qp: IQuestionPaperFile) => void;
};

const Modal: Component<Props> = ({ close, qPaper, update }) => {
    const [data, setData] = createStore(qPaper);
    const [validationErrors, setValidationErrors] = createStore<IErrorMessage>(validate(qPaper));

    createEffect(() => {
        setValidationErrors(validate(data));
    });

    createEffect(() => {
        if (data.course_code.length == 7) {
            let course_name = getCourseFromCode(data.course_code);
            setData((prev) => ({ ...prev, course_name }));
        }
    });

    return (
        <div class="modal-overlay">
            <div class="modal">
                <form class="upload-form">
                    <h2>Edit Course Details</h2>
                    <div class="form-group">
                        <label for="filename">Filename:</label>
                        <input
                            type="text"
                            id="filename"
                            name="filename"
                            required
                            value={data.file.name}
                            disabled
                        />
                    </div>
                    <div class="two-columns">
                        <div class="form-group">
                            <label for="course_code">Course Code:</label>
                            <input
                                type="text"
                                id="course_code"
                                name="course_code"
                                required
                                value={data.course_code}
                                onChange={(e) => {
                                    setData((prev) => {
                                        return {
                                            ...prev,
                                            course_code: e.target.value,
                                        };
                                    });
                                }}
                            />
                            {validationErrors.courseCodeErr !== null && (
                                <p class="error-msg">
                                    {validationErrors.courseCodeErr}
                                </p>
                            )}
                        </div>
                        <div class="form-group">
                            <label for="year">Year:</label>
                            <select
                                id="year"
                                name="year"
                                required
                                value={data.year}
                                onChange={(e) => {
                                    setData((prev) => ({
                                        ...prev,
                                        year: parseInt(e.target.value),
                                    }));
                                }}
                            >
                                <option value="">-- Select Year --</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                                <option value="2021">2021</option>
                                <option value="2020">2020</option>
                                <option value="2019">2019</option>
                            </select>
                            {validationErrors.yearErr && (
                                <p class="error-msg">{validationErrors.yearErr}</p>
                            )}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="course_name">Course Name:</label>
                        <div>
                            <input
                                type="text"
                                id="course_name"
                                name="course_name"
                                required
                                value={data.course_name}
                                onChange={(e) => {
                                    setData((prev) => ({
                                        ...prev,
                                        course_name: e.target.value,
                                    }));
                                }}
                            />
                            {validationErrors.courseNameErr !== null && (
                                <p class="error-msg">
                                    {validationErrors.courseNameErr}
                                </p>
                            )}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="exam">Exam:</label>
                        <div class="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    id="exam-mid-semester"
                                    name="exam"
                                    value="midsem"
                                    required
                                    checked={data.exam == "midsem"}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setData((prev) => ({
                                                ...prev,
                                                exam: "midsem",
                                            }))
                                        }
                                    }}
                                />
                                Mid Semester
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    id="exam-end-semester"
                                    name="exam"
                                    value="endsem"
                                    required
                                    checked={data.exam == "endsem"}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setData((prev) => ({
                                                ...prev,
                                                exam: "endsem",
                                            }))
                                        }
                                    }}
                                />
                                End Semester
                            </label>
                        </div>
                        {validationErrors.examErr !== null && (
                            <p class="error-msg">{validationErrors.examErr}</p>
                        )}
                    </div>
                    <div class="form-group">
                        <label for="semester">Semester:</label>
                        <div class="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    id="semester-autumn"
                                    name="semester"
                                    value="autumn"
                                    required
                                    checked={data.semester == "autumn"}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setData((prev) => ({
                                                ...prev,
                                                semester: "autumn"
                                            }))
                                        }
                                    }}
                                />
                                Autumn Semester
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    id="semester-spring"
                                    name="semester"
                                    value="spring"
                                    required
                                    checked={data.semester == "spring"}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setData((prev) => ({
                                                ...prev,
                                                semester: "spring",
                                            }))
                                        }
                                    }}
                                />
                                Spring Semester
                            </label>
                        </div>
                        {validationErrors.semesterErr !== null && (
                            <p class="error-msg">{validationErrors.semesterErr}</p>
                        )}
                    </div>
                    <div class="control-group">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                close();
                            }}
                            class="cancel-btn"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                toast.success(
                                    "File details updated successfully"
                                );
                                update(data);
                                close();
                            }}
                            class={
                                "save-btn"
                            }
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default Modal;
