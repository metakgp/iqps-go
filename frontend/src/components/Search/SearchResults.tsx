import { useEffect, useState } from 'react';
import { ISearchResult } from '../../types/question_paper';
import { copyLink } from '../../utils/copyLink';
import Spinner from '../Spinner/Spinner';
import './search_results.scss';
import { IoLink } from 'react-icons/io5';
import { FaFilePdf, FaRegPenToSquare, FaDownload, FaSquareCheck, FaSquare, FaFileZipper } from 'react-icons/fa6';
import { Select } from '../Common/Form';
import { useAuthContext } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backend';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

type SortBy = 'relevance' | 'course_name' | 'year';
type SortOrder = 'ascending' | 'descending';
type FilterByYear = number | null;
type FilterFields = 'filterByYear' | 'sortBy' | 'sortOrder';

interface ISearchResultsProps {
	awaitingResults: boolean;
	success: boolean;
	msg: string;
	results: ISearchResult[];
}


function SearchResults(props: ISearchResultsProps) {
	const [displayedResults, setDisplayedResults] = useState<ISearchResult[]>(props.results);
	const [filterByYear, setFilterByYear] = useState<FilterByYear>(null);
	const [sortBy, setSortBy] = useState<SortBy>('relevance');
	const [sortOrder, setSortOrder] = useState<SortOrder>('descending');
	const [showDownloadOptions, setShowDownloadOptions] = useState(false);
	const [availableYears, setAvailableYears] = useState<number[]>([]);
	const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
	const [isDownloading, setIsDownloading] = useState(false);

	const updateFilters = (field: FilterFields, value: string) => {
		switch (field) {
			case 'filterByYear':
				setFilterByYear(value === 'null' ? null : parseInt(value));
				break;
			case 'sortBy':
				setSortBy(value as SortBy);
				break;
			case 'sortOrder':
				setSortOrder(value as SortOrder);
				break;
		}
	}

	const updateDisplayedResults = () => {
		let filtered_results = props.results.slice();
		if (filterByYear !== null) filtered_results = filtered_results.filter((result) => result.year === filterByYear);

		if (sortBy === 'relevance') {
			setDisplayedResults(filtered_results);
			return;
		}

		const sorted_results = filtered_results.sort((a, b) => {
			// Fall back to course name sorting when results are filtered by year.
			const fallback_sorting = sortBy === 'year' && filterByYear !== null;

			const sort_by: SortBy = fallback_sorting ? 'course_name' : sortBy;
			const sort_order: SortOrder = fallback_sorting ? 'ascending' : sortOrder;

			const first = sort_order === "ascending" ? a : b;
			const second = sort_order === "ascending" ? b : a;

			switch (sort_by) {
				case "year":
					return first.year - second.year;
				case "course_name":
					return first.course_name.localeCompare(second.course_name);
			}
		});

		setDisplayedResults(sorted_results);
	}

	// To update when new results are fetched
	useEffect(() => {
		const unique_years: Set<number> = new Set();

		props.results.forEach((result) => unique_years.add(result.year));
		setAvailableYears(Array.from(unique_years.values()).sort().reverse());
		setFilterByYear(null);

		updateDisplayedResults();
	}, [props.results])

	// To update when filters are changed
	useEffect(updateDisplayedResults, [filterByYear, sortBy, sortOrder])

	// Prune selection to only currently-visible papers whenever the displayed
	// list changes (new search, filter, or sort). This keeps the "Download
	// Selected (N)" count accurate and prevents hidden selections from
	// silently changing what gets downloaded.
	useEffect(() => {
		setSelectedPapers(prev => {
			const visibleIds = new Set(displayedResults.map(r => r.id));
			const pruned = new Set<number>();
			prev.forEach(id => { if (visibleIds.has(id)) pruned.add(id); });
			return pruned;
		});
		setShowDownloadOptions(false);
	}, [displayedResults])

	// Sanitize a string for safe use as a filesystem/ZIP entry name.
	// Strips path separators, control characters, and Windows-reserved chars,
	// collapses whitespace to single hyphens, and trims length.
	const sanitizeFilename = (value: string | number | undefined | null, fallback: string): string => {
		const raw = value === undefined || value === null ? '' : String(value);
		const cleaned = raw
			.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '') // strip reserved/control chars
			.trim()
			.replace(/\s+/g, '-');                    // collapse whitespace
		const safe = cleaned.length > 0 ? cleaned : fallback;
		return safe.slice(0, 80) || fallback;        // cap length defensively
	};

	const togglePaperSelection = (id: number) => {
		setSelectedPapers(prev => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const toggleSelectAll = () => {
		if (selectedPapers.size === displayedResults.length) {
			setSelectedPapers(new Set());
		} else {
			setSelectedPapers(new Set(displayedResults.map(r => r.id)));
		}
	};

	// Convert external/static URL to a CORS-enabled backend proxy URL.
	// The backend exposes /library/* which serves files from LIBRARY_QPS_PATH
	// (default /peqp/qp). We strip that prefix and route through BACKEND_URL so
	// fetch() works regardless of where the frontend is hosted.
	const getProxyUrl = (url: string): string => {
		try {
			const parsed = new URL(url, window.location.origin);
			const pathname = parsed.pathname;

			// Match either an already-proxied /library/<path> or the upstream
			// /peqp/qp/<path> layout used by the static files server.
			const libraryMatch = pathname.match(/^\/(?:library|peqp\/qp)\/(.+)$/);
			if (libraryMatch) {
				const tail = libraryMatch[1];
				const base = BACKEND_URL.replace(/\/$/, '');
				return `${base}/library/${tail}`;
			}
		} catch {
			// Fall through and return the original URL below.
		}
		return url;
	};

	// Download as ZIP using backend proxy (CORS-enabled)
	const downloadAsZip = async () => {
		if (selectedPapers.size === 0) {
			toast.error('No papers selected');
			return;
		}

		const selectedResults = displayedResults.filter(r => selectedPapers.has(r.id));
		if (selectedResults.length === 0) {
			toast.error('No visible papers selected. Adjust filters and try again.');
			return;
		}

		// ZIP download only works for library papers because the backend's
		// /library endpoint serves files from LIBRARY_QPS_PATH (/peqp/qp).
		// Non-library uploads live elsewhere and would fail CORS via fetch().
		const nonLibraryCount = selectedResults.filter(r => !r.from_library).length;
		if (nonLibraryCount > 0) {
			toast.error('Some selected papers are not from the library and cannot be downloaded via ZIP. Open them individually instead.');
			return;
		}

		// Single paper - direct download
		if (selectedResults.length === 1) {
			window.open(selectedResults[0].filelink, '_blank');
			return;
		}

		// Cap the number of papers bundled into a single ZIP to avoid OOM:
		// every PDF plus the final archive is held fully in memory.
		const MAX_ZIP_PAPERS = 25;
		if (selectedResults.length > MAX_ZIP_PAPERS) {
			toast.error(`Too many papers selected for ZIP download. Please select ${MAX_ZIP_PAPERS} or fewer.`);
			return;
		}

		setIsDownloading(true);
		setShowDownloadOptions(false);
		const toastId = toast.loading(`Downloading ${selectedResults.length} paper(s) as ZIP...`);

		try {
			const zip = new JSZip();

			// Download all PDFs in parallel using proxy URLs
			const downloadPromises = selectedResults.map(async (result) => {
				const proxyUrl = getProxyUrl(result.filelink);
				const response = await fetch(proxyUrl);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const blob = await response.blob();
				// Include `id` so duplicate metadata fields don't collide and
				// silently overwrite earlier entries inside the ZIP.
				const filename = [
					sanitizeFilename(result.course_code, 'unknown'),
					sanitizeFilename(result.year, '0000'),
					sanitizeFilename(result.exam, 'unknown'),
					sanitizeFilename(result.semester, 'na'),
					sanitizeFilename(result.id, '0'),
				].join('_') + '.pdf';
				zip.file(filename, blob);
			});

			await Promise.all(downloadPromises);

			// Generate ZIP filename: course_name_coursecode_years.zip
			const courseName = sanitizeFilename(selectedResults[0].course_name, 'unknown');
			const courseCode = sanitizeFilename(selectedResults[0].course_code, 'unknown');
			const years = [...new Set(selectedResults.map(r => r.year))]
				.sort((a, b) => a - b)
				.join('-');
			const zipFilename = `${courseName}_${courseCode}_${years}.zip`;

			const content = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(content);
			const a = document.createElement('a');
			a.href = url;
			a.download = zipFilename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success(`Downloaded ${selectedResults.length} paper(s) as ZIP`, { id: toastId });
		} catch (error) {
			console.error('ZIP download error:', error);
			toast.error('Failed to download as ZIP. Try opening files individually.', { id: toastId });
		} finally {
			setIsDownloading(false);
		}
	};

	// Download files one by one sequentially (allows choosing save location)
	const downloadFilesSequentially = async () => {
		if (selectedPapers.size === 0) {
			toast.error('No papers selected');
			return;
		}

		const selectedResults = displayedResults.filter(r => selectedPapers.has(r.id));
		if (selectedResults.length === 0) {
			toast.error('No visible papers selected. Adjust filters and try again.');
			return;
		}

		// Sequential download also relies on the CORS-enabled /library proxy,
		// so it only works for library papers.
		const nonLibraryCount = selectedResults.filter(r => !r.from_library).length;
		if (nonLibraryCount > 0) {
			toast.error('Some selected papers are not from the library and cannot be downloaded via this option. Open them individually instead.');
			return;
		}

		setShowDownloadOptions(false);
		setIsDownloading(true);
		const total = selectedResults.length;
		let completed = 0;
		let failed = 0;

		toast.loading(`Downloading 0/${total}...`, { id: 'sequential-download' });

		for (const result of selectedResults) {
			// Include `id` so duplicate metadata fields don't collide and
			// cause the browser to auto-rename or overwrite files.
			const filename = [
				sanitizeFilename(result.course_code, 'unknown'),
				sanitizeFilename(result.year, '0000'),
				sanitizeFilename(result.exam, 'unknown'),
				sanitizeFilename(result.semester, 'na'),
				sanitizeFilename(result.id, '0'),
			].join('_') + '.pdf';
			const proxyUrl = getProxyUrl(result.filelink);

			try {
				const response = await fetch(proxyUrl);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const blob = await response.blob();

				// Create download link
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				completed++;
				toast.loading(`Downloading ${completed}/${total}...`, { id: 'sequential-download' });

				// Wait between downloads to let browser handle each save dialog
				if (completed < total) {
					await new Promise(resolve => setTimeout(resolve, 1500));
				}
			} catch (error) {
				console.error(`Failed to download ${filename}:`, error);
				failed++;
			}
		}

		toast.dismiss('sequential-download');
		if (failed === 0) {
			toast.success(`Downloaded ${completed} paper(s)`);
		} else {
			toast.error(`Downloaded ${completed}, failed ${failed}`);
		}

		setIsDownloading(false);
	};

	const handleDownloadClick = () => {
		if (selectedPapers.size === 0) {
			toast.error('No papers selected');
			return;
		}
		setShowDownloadOptions(!showDownloadOptions);
	};

	return <div className="search-results">
		{
			props.awaitingResults ? <div className="spinner"><Spinner /></div> :
				!props.success ? (
					<p className="message">{props.msg}</p>
				) : (
					<>
						<ResultsFilter
							filterByYear={filterByYear}
							availableYears={availableYears}
							sortBy={sortBy}
							sortOrder={sortOrder}
							updateFilters={updateFilters}
						/>
						{
							displayedResults.length > 0 ? (
								<>
									<div className="selection-controls">
										<button
											className="select-all-btn"
											onClick={toggleSelectAll}
											disabled={isDownloading}
										>
											{selectedPapers.size === displayedResults.length ? 'Deselect All' : 'Select All'}
										</button>
										<div className="download-dropdown-container">
											<button
												className="download-selected-btn"
												onClick={handleDownloadClick}
												disabled={selectedPapers.size === 0 || isDownloading}
											>
												<FaDownload />
												{isDownloading ? 'Downloading...' : `Download Selected (${selectedPapers.size})`}
											</button>
											{showDownloadOptions && (
												<div className="download-dropdown">
													{selectedPapers.size > 1 && (
														<button
															className="download-option-btn"
															onClick={downloadAsZip}
															disabled={isDownloading}
														>
															<FaFileZipper />
															Download as ZIP
														</button>
													)}
													<button
														className="download-option-btn"
														onClick={downloadFilesSequentially}
														disabled={isDownloading}
													>
														<FaDownload />
														Download One by One
													</button>
												</div>
											)}
										</div>
									</div>
									<div className="search-results">
										{displayedResults.map((result) => (
											<ResultCard
												key={result.id}
												{...result}
												isSelected={selectedPapers.has(result.id)}
												onToggleSelection={() => togglePaperSelection(result.id)}
											/>
										))}
									</div>
								</>
							) : <p>No results.</p>
						}
					</>
				)
		}
	</div>;
}

interface IResultsFilterProps {
	filterByYear: FilterByYear;
	availableYears: number[];
	sortBy: SortBy;
	sortOrder: SortOrder;
	updateFilters: (field: FilterFields, value: string) => void;
}
function ResultsFilter(props: IResultsFilterProps) {
	return <div className="row results-filter">
		<Select
			value={(props.filterByYear ?? 'null').toString()}
			options={[
				{ value: 'null', title: 'All Years' },
				...props.availableYears.map((year) => {
					return { title: year.toString(), value: year.toString() }
				})
			]}
			onInput={(e) => props.updateFilters('filterByYear', e.currentTarget.value)}
		/>

		<Select
			value={props.sortBy}
			options={[
				{ value: 'relevance', title: 'Sort by Relevance' },
				{ value: 'year', title: 'Sort by Year' },
				{ value: 'course_name', title: 'Sort by Course Name' },
			]}
			onInput={(e) => props.updateFilters('sortBy', e.currentTarget.value)}
		/>

		<Select
			value={props.sortOrder}
			options={[
				{ value: 'ascending', title: 'Ascending' },
				{ value: 'descending', title: 'Descending' }
			]}
			onInput={(e) => props.updateFilters('sortOrder', e.currentTarget.value)}
		/>
	</div>
}

interface IResultCardProps extends ISearchResult {
	isSelected: boolean;
	onToggleSelection: () => void;
}

function ResultCard(result: IResultCardProps) {
	const auth = useAuthContext();

	const getSemesterTag = (sem: ISearchResult['semester']) => {
		// empty string - N/A
		// midsem - MID; endsem - END
		// ctx - CT1, CT2, etc.
		return sem === '' ? 'N/A' :
			(sem === 'autumn' || sem === 'spring') ?
				sem.slice(0, 3).toUpperCase() :
				sem;
	}

	const getSemesterTooltip = (semester: ISearchResult['semester']) => {
		if (semester.length > 0) {
			return semester[0].toUpperCase() + semester.slice(1) + ' Semester'
		} else {
			return "Unknown Semester";
		}
	}

	const getExamTag = (exam: ISearchResult['exam']) => {
		// empty string - Unknown
		// midsem - Midsem; endsem - Endsem
		// ctx - Class Test 1, Class Test 2, etc.
		return exam === '' ? 'Unknown' :
			(exam === 'midsem' || exam === 'endsem') ?
				exam.slice(0, 3).toUpperCase() :
				exam.toUpperCase();
	}

	const getExamTooltip = (exam: ISearchResult['exam']) => {
		// empty string - Unknown
		// midsem - Midsem; endsem - Endsem
		// ctx - Class Test 1, Class Test 2, etc.
		return exam === '' ? 'Unknown' :
			(exam === 'midsem' || exam === 'endsem') ?
				exam[0].toUpperCase() + exam.slice(1) :
				`Class Test ${exam.slice(2).length > 0 ? exam.slice(2) : '?'}`;
	}

	const getTitle = () => {
		let title = `${result.course_name}`;

		if (result.course_code) title += ` (${result.course_code})`;

		return title;
	}

	return <div className={`result-card ${result.isSelected ? 'selected' : ''}`}>
		<button
			type="button"
			className="result-card-checkbox"
			onClick={result.onToggleSelection}
			role="checkbox"
			aria-checked={result.isSelected}
			aria-label={result.isSelected ? 'Deselect paper' : 'Select paper'}
		>
			{result.isSelected ? <FaSquareCheck size="1.2rem" /> : <FaSquare size="1.2rem" />}
		</button>
		<div className="result-card-info">
			<p className="result-card-title">{getTitle()}</p>
			<div className="result-card-tags">
				<span className="result-card-tag">{result.year}</span>
				<span className="result-card-tag" title={getExamTooltip(result.exam)}>{getExamTag(result.exam)}</span>
				<span className="result-card-tag" title={getSemesterTooltip(result.semester)}>{getSemesterTag(result.semester)}</span>
				{result.note !== "" && <span className="result-card-tag">{result.note}</span>}
				{auth.isAuthenticated && <span className="result-card-tag">id: {result.id}</span>}
			</div>
		</div>
		<div className="result-card-btns">
			{auth.isAuthenticated && <a
				className="result-card-btn icon-btn"
				href={`/admin?edit=${result.id}`}
				title="Edit PDF"
				target="_blank"
				rel="noopener noreferrer"
			>
				<FaRegPenToSquare size="1.2rem" />
			</a>}
			<a
				className="result-card-btn icon-btn"
				href={result.filelink}
				title="Open PDF"
				target="_blank"
				rel="noopener noreferrer"
			>
				<FaFilePdf size="1.2rem" />
			</a>
			<button
				className="result-card-btn icon-btn"
				title="Share PDF"
				onClick={(e) => copyLink(e, result.filelink)}
			>
				<IoLink size="1.2rem" />
			</button>
		</div>
	</div>;
}

export default SearchResults;