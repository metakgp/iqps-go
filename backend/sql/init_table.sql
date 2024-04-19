CREATE TABLE IF NOT EXISTS qp (
    id SERIAL PRIMARY KEY,
    course_code TEXT NOT NULL DEFAULT '',
    course_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    exam TEXT CHECK (exam IN ('midsem', 'endsem') OR exam = ''),
    filelink TEXT NOT NULL,
    from_library BOOLEAN DEFAULT FALSE,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approve_status BOOLEAN DEFAULT FALSE
);
