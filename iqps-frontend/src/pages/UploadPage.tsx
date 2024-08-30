import { FaSearch } from "react-icons/fa";
import { Header } from "../components/Common/Common";

function UploadPage() {
	return <>
		<Header
			title="Question Paper Upload"
			subtitle="Upload your question papers for the benefit of humanity."
			link={{
				to: "/",
				icon: FaSearch,
				text: "Want to find a question paper?",
				button_text: "Search!"
			}}
		/>
	</>;
}

export default UploadPage;