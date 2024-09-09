package query

const QP_SEARCH_QUERY = `
SELECT
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
      course_details_tsvector @@ websearch_to_tsquery('simple', $1)
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
      course_details %>> $1
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
      course_details_tsvector @@ to_tsquery(
        'simple',
        websearch_to_tsquery('simple', $1)::text || ':*'
      )
      AND approve_status = true
  )`

const QP_SEARCH = `
with fuzzy as ( 
    select id,
           similarity(course_code || ' ' || course_name, @query_text) as sim_score,
           row_number() over (order by similarity(course_code || ' ' || course_name, @query_text) desc) as rank_ix
    from iqps_test
    where (course_code || ' ' || course_name) %>> @query_text
    order by rank_ix
),
full_text as (
  select
    id,
    ts_rank_cd(fts_course_details, websearch_to_tsquery(@query_text)) as rank_score,
    row_number() over(order by ts_rank_cd(fts_course_details , websearch_to_tsquery(@query_text)) desc) as rank_ix
  from
    iqps_test
  where
    fts_course_details @@ websearch_to_tsquery(@query_text)
    AND approve_status = true
  order by rank_ix
),
partial_search as (
  select id, 
    ts_rank_cd(fts_course_details , to_tsquery('simple', websearch_to_tsquery('simple', @query_text)::text || ':*' )) as rank_score,
    row_number() over(order by ts_rank_cd(fts_course_details , to_tsquery('simple', websearch_to_tsquery('simple', @query_text)::text || ':*' )) desc) as rank_ix
  from iqps_test where 
      fts_course_details @@ to_tsquery(
        'simple',
        websearch_to_tsquery('simple', @query_text)::text || ':*'
      )
      AND approve_status = true
),  result as (
  select
  iqps_test.id,iqps_test.course_code, iqps_test.course_name, iqps_test.year, iqps_test.exam, iqps_test.filelink, iqps_test.from_library, iqps_test.upload_timestamp, iqps_test.approve_status
from
  fuzzy
  full outer join full_text on fuzzy.id = full_text.id
  full outer join partial_search on coalesce(fuzzy.id, full_text.id) = partial_search.id
  join iqps_test on coalesce(fuzzy.id, full_text.id, partial_search.id) = iqps_test.id
order by
  coalesce(1.0 / (50 + fuzzy.rank_ix), 0.0) * 1 +
  coalesce(1.0 / (50 + full_text.rank_ix), 0.0) * 1 +
  coalesce(1.0 / (50 + partial_search.rank_ix), 0.0) * 1
  desc
)
  select * from result
`
