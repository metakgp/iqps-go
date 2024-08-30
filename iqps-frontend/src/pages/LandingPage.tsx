import { Header } from "../components/Common/Common";
import { FaUpload } from "react-icons/fa6";

function LandingPage() {
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
	</>;
}

export default LandingPage;