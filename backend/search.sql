CREATE VIRTUAL TABLE qp_better USING fts5(course_name, tokenize="porter ascii");
INSERT INTO qp_better SELECT course_name FROM qp;