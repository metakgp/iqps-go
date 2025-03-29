import './styles/upload_instructions.scss';

export function UploadInstructions() {
	return <div className="upload-instructions">
		<h2 className="instruction-heading">Upload Instructions</h2>
		<div className="instructions">
			<div className="instruction-section">
				<h3>File Format</h3>
				<p>Only PDF files are accepted.</p>
			</div>
			<div className="instruction-section">
				<h3>File Naming (optional)</h3>
				<p>Use this format: <span className="file-format-example">course_code.pdf</span></p>
				<p>
					<strong>Example: </strong> <em>CS10001.pdf</em>
				</p>
			</div>
			<div className="instruction-section">
				<h3>Year Convention</h3>
				<p>The year the exam was conducted is displayed in the paper details.</p>
				<p>This prevents any ambiguity as only the year is mentioned in some papers.</p>
				<p>
					<strong>Example: </strong> Spring 2024-2025 exam is conducted in the year 2025 so the year will be 2025, but for autumn it will be 2024.
				</p>
			</div>
			<h3>NOTE: The uploaded paper will be searchable only after manual review process first. Please wait for a few days and do not re-upload.</h3>
		</div>
	</div>;
}
