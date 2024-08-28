ALTER TABLE qp ADD COLUMN course_code_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('simple', course_name)) STORED;
CREATE INDEX idx_course_code_tsvector ON qp USING GIN (course_code_tsvector);
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_course_code_trgm ON qp USING GIN (course_code gin_trgm_ops);