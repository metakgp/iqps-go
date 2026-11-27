import { MAX_FILE_SIZE_MB } from '../../utils/institute';
import './styles/upload_instructions.scss';

export function UploadInstructions() {
	return <div className="upload-instructions">
		<h2 className="instruction-heading">Upload Instructions</h2>
		<div className="instructions">
			<div className="instruction-section">
				<h3>File Format</h3>
				<p>Only PDF files are accepted, up to {MAX_FILE_SIZE_MB} MB each. Details are auto-filled from the first page, so please check them before uploading.</p>
			</div>
			<div className="instruction-section">
				<h3>File Naming (optional)</h3>
				<p>Use this format: <span className="file-format-example">course_code_exam_year.pdf</span></p>
				<p>
					<strong>Example: </strong> <em>CSL101_endsem_2024.pdf</em>
				</p>
			</div>
			<div className="instruction-section">
				<h3>Year Convention</h3>
				<p>The year the exam was conducted is displayed in the paper details.</p>
				<p>This prevents any ambiguity as only the year is mentioned in some papers.</p>
				<p>
					<strong>Example: </strong> A Winter 2024-25 exam is held in 2025, so the year is 2025. A Monsoon 2024-25 exam is held in 2024, so the year is 2024.
				</p>
			</div>
			<h3>NOTE: The uploaded paper will be searchable only after manual review process first. Please wait for a few days and do not re-upload.</h3>
		</div>
	</div>;
}
