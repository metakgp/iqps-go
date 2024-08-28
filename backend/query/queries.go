package query

const QP_SEARCH_QUERY = `SELECT
  *
FROM
  (
    SELECT
      id,
      course_code,
      course_name,
      year,
      exam,
      filelink,
      from_library,
      upload_timestamp,
      approve_status
    FROM
      qp
    WHERE
      course_details_tsvector @ @ websearch_to_tsquery('simple', $ 1)
      AND approve_status = true
    UNION
    SELECT
      id,
      course_code,
      course_name,
      year,
      exam,
      filelink,
      from_library,
      upload_timestamp,
      approve_status
    from
      qp
    where
      course_details % > > $ 1
      AND approve_status = true
    UNION
    SELECT
      id,
      course_code,
      course_name,
      year,
      exam,
      filelink,
      from_library,
      upload_timestamp,
      approve_status
    from
      qp
    where
      course_details_tsvector @ @ to_tsquery(
        'simple',
        websearch_to_tsquery('simple', $ 1) :: text || ':*'
      )
      AND approve_status = true
  )`
