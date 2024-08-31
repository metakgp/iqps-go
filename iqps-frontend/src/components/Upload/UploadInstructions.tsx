import './upload_instructions.scss';

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
				<h3>How to Upload</h3>
				<p>Click "Choose File" to select your PDF.</p>
				<p>Click "Upload" to submit.</p>
			</div>
			<h3>NOTE: The uploaded paper will be searchable only after manual review process first. Please wait for a few days and do not re-upload.</h3>
		</div>
	</div>;
}