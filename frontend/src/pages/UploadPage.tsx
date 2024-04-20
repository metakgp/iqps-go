import { A } from "@solidjs/router";
import { AiOutlineCloudUpload as UploadIcon } from "solid-icons/ai";

function UploadPage() {
	return (
		<div class="upload-page">
			<div class="title">
				<h1>IQPS - Question Paper Upload</h1>
				<p><i>Upload your question papers for future humans to use!</i></p>
				<h3><A href="/">Question paper search</A></h3>
			</div>

			<div class="upload-area">
				<UploadIcon size="5rem" />
				<h2>Click or drop files to upload</h2>
			</div>
		</div>
	)
}

export default UploadPage;