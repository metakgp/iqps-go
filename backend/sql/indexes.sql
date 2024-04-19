ALTER TABLE qp ADD COLUMN course_code_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', course_code)) STORED;
CREATE INDEX idx_course_code_tsvector ON qp USING GIN (course_code_tsvector);