import { createSignal, onMount } from "solid-js";
import SearchResults from "./SearchResults";
import type { SearchResult } from "../types/types";

const sampleSearchResults: SearchResult[] = [
  {
    id: 1,
    courseName: "Introduction to Computer Science",
    courseCode: "CS101",
    year: 2021,
    semester: "Fall",
    fileLink: "https://example.com/files/cs101-fall2021.pdf",
  },
  {
    id: 2,
    courseName: "Advanced Mathematics",
    courseCode: "MATH301",
    year: 2022,
    semester: "Spring",
    fileLink: "https://example.com/files/math301-spring2022.pdf",
  },
  {
    id: 3,
    courseName: "Modern Physics",
    courseCode: "PHY204",
    year: 2021,
    semester: "Spring",
    fileLink: "https://example.com/files/phy204-spring2021.pdf",
  },
  {
    id: 4,
    courseName: "Literature and Composition",
    courseCode: "LIT101",
    year: 2020,
    semester: "Fall",
    fileLink: "https://example.com/files/lit101-fall2020.pdf",
  },
  {
    id: 5,
    courseName: "Introduction to Sociology",
    courseCode: "SOC101",
    year: 2022,
    semester: "Mid Sem",
    fileLink: "https://example.com/files/soc101-midsem2022.pdf",
  },
];

function CourseSearchForm() {
  // Create signals for each form input
  const [courseCode, setCourseCode] = createSignal("");
  const [year, setYear] = createSignal<number>(0);
  const [semester, setSemester] = createSignal("");
  const [years, setYears] = createSignal<number[]>([]);
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]); // Signal to store search results

  async function fetchYears() {
    try {
      // const response = await fetch("https://your-server.com/api/years");
      // const data = await response.json();
      setYears([2020, 2021, 2022]);
    } catch (error) {
      console.error("Error fetching years:", error);
    }
  }

  // Fetch years when the component mounts
  onMount(() => {
    fetchYears();
  });

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action

    const params = new URLSearchParams();
    if (courseCode()) params.append("courseCode", courseCode());
    if (year()) params.append("year", year().toString());
    if (semester()) params.append("semester", semester());

    try {
      // const response = await fetch(
      //   `https://your-server.com/api/courses?${params}`,
      //   {
      //     method: "GET", // GET request
      //   }
      // );
      // const data = await response.json();
      setSearchResults(sampleSearchResults); // Handle the response data
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label for="courseCode">Course Code:</label>
          <input
            id="courseCode"
            value={courseCode()}
            onInput={(e) => setCourseCode(e.target.value)}
          />
        </div>
        <div>
          <label for="year">Year:</label>
          <select id="year" name="year">
            <option value="">Select a year</option>
            {years().map((year) => (
              <option value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label for="semester">Semester:</label>
          <select
            id="semester"
            value={semester()}
            onInput={(e) => setSemester(e.target.value)}
          >
            <option value="">Select a semester</option>
            <option value="Mid Sem">Mid Sem</option>
            <option value="End Sem">End Sem</option>
          </select>
        </div>
        <button type="submit">Search</button>
      </form>
      <SearchResults results={searchResults()} />
    </div>
  );
}

export default CourseSearchForm;
