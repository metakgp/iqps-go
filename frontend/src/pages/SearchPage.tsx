import { Header } from "../components/Common/Common";
import { FaUpload } from "react-icons/fa6";
import CourseSearchForm from "../components/Search/SearchForm";
import StatsShowcase from "../components/Search/Stats";


function SearchPage() {
	return <>
		<Header
			title="Intelligent Question Paper Search"
			subtitle="Search for question papers when the library can't save you."
			link={{
				to: "/upload",
				icon: FaUpload,
				text: "Have old question papers?",
				button_text: "Upload!"
			}}
		/>
		<StatsShowcase />
		<CourseSearchForm />
	</>;
}

export default SearchPage;