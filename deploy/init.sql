-- IIT Bhilai PYQ portal: database schema (same as IQPS's INIT_DB in backend/src/db/queries.rs).
-- Runs automatically the first time the Postgres container starts with an empty volume.
-- Value conventions (unchanged from IQPS, only the UI labels differ):
--   semester: 'autumn' = Monsoon, 'spring' = Winter
--   exam:     'midsem', 'endsem', 'ct1' = Quiz 1, 'ct2' = Quiz 2 ('ct' = quiz, number unknown)
--   note:     'Supplementary' for supplementary exams
--   approve_status=false + is_deleted=false  -> pending review

CREATE TABLE IF NOT EXISTS iqps (
    id integer primary key GENERATED ALWAYS AS identity,
    course_code TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL DEFAULT '',
    year INTEGER NOT NULL,
    exam TEXT NOT NULL DEFAULT '',
    semester VARCHAR NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    filelink TEXT NOT NULL,
    from_library BOOLEAN DEFAULT FALSE,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approve_status BOOLEAN DEFAULT FALSE,
    approved_by TEXT DEFAULT '',
    is_deleted BOOLEAN DEFAULT FALSE,
    fts_course_details tsvector GENERATED ALWAYS AS (to_tsvector('english', course_code || ' ' || course_name)) stored
);
CREATE INDEX IF NOT EXISTS iqps_fts ON iqps USING gin (fts_course_details);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_course_name_trgm ON iqps USING gin (course_name gin_trgm_ops);

-- Added for the IIT Bhilai fork: speeds up the admin "similar papers" (duplicate) check.
CREATE INDEX IF NOT EXISTS idx_course_code ON iqps (course_code, year, semester, exam);
