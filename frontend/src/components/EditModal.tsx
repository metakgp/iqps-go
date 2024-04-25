import { Component, For, createSignal } from "solid-js";
import { QuestionPaper } from "../types/types";
import { getCourseFromCode } from "../utils/autofillData";

type Props = {
    close: () => void;
    qPaper: QuestionPaper;
    update: (qp: QuestionPaper) => void;
};

const Modal: Component<Props> = ({ close, qPaper, update }) => {
    const [data, setData] = createSignal(qPaper);
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
                            value={data().file.name}
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
                                value={data().course_code}
                                onChange={(e) => {
                                    setData((prev) => {
                                        let course_name = prev.course_name;
                                        if (e.target.value.length == 7)
                                            course_name = getCourseFromCode(
                                                e.target.value
                                            );
                                        return {
                                            ...prev,
                                            course_code: e.target.value,
                                            course_name: course_name,
                                        };
                                    });
                                }}
                            />
                        </div>
                        <div class="form-group">
                            <label for="year">Year:</label>
                            <select
                                id="year"
                                name="year"
                                required
                                value={data().year}
                                onChange={(e) => {
                                    setData((prev) => ({
                                        ...prev,
                                        year: e.target.value,
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
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="course_name">Course Name:</label>
                        <input
                            type="text"
                            id="course_name"
                            name="course_name"
                            required
                            value={data().course_name}
                            onChange={(e) => {
                                setData((prev) => ({
                                    ...prev,
                                    course_name: e.target.value,
                                }));
                            }}
                        />
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
                                    checked={data().exam == "midsem"}
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            exam: "midsem",
                                        }))
                                    }
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
                                    checked={data().exam == "endsem"}
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            exam: "endsem",
                                        }))
                                    }
                                />
                                End Semester
                            </label>
                        </div>
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
                                    checked={data().semester == "autumn"}
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            semester: "autumn",
                                        }))
                                    }
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
                                    checked={data().semester == "spring"}
                                    onChange={(e) =>
                                        setData((prev) => ({
                                            ...prev,
                                            semester: "spring",
                                        }))
                                    }
                                />
                                Spring Semester
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <button onClick={close} type="submit">
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                update(data());
                                close();
                            }}
                            type="submit"
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
