/* Source: https://github.com/MariaDB/server/blob/10.6/include/mysql_com.h */

typedef char my_bool;

enum Item_result
{
  STRING_RESULT=0, REAL_RESULT, INT_RESULT, ROW_RESULT, DECIMAL_RESULT,
  TIME_RESULT
};

typedef struct st_udf_args
{
  unsigned int arg_count;		/* Number of arguments */
  enum Item_result *arg_type;		/* Pointer to item_results */
  char **args;				/* Pointer to argument */
  unsigned long *lengths;		/* Length of string arguments */
  char *maybe_null;			/* Set to 1 for all maybe_null args */
  const char **attributes;              /* Pointer to attribute name */
  unsigned long *attribute_lengths;     /* Length of attribute arguments */
  void *extension;
} UDF_ARGS;

  /* This holds information about the result */

typedef struct st_udf_init
{
  my_bool maybe_null;          /* 1 if function can return NULL */
  unsigned int decimals;       /* for real functions */
  unsigned long max_length;    /* For string functions */
  char *ptr;                   /* free pointer for function data */
  my_bool const_item;          /* 1 if function always returns the same value */
  void *extension;
} UDF_INIT;


extern "C" {
/* Reference: https://www.oreilly.com/library/view/mysql-reference-manual/0596002653/ch09s02.html */
long long bitap(UDF_INIT *initid, UDF_ARGS *args,
              char *is_null, char *error);

my_bool bitap_init(UDF_INIT *initid, UDF_ARGS *args, char *message);

void bitap_deinit(UDF_INIT *initid);

}

