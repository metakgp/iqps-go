#include "mariadb.hpp"
#include <cstring>
#include <cstdlib>
#include <climits>

my_bool bitap_init(UDF_INIT *initid, UDF_ARGS *args, char *message)
{
    if (args->arg_count != 2 || args->arg_type[0] != STRING_RESULT || args->arg_type[1] != STRING_RESULT){
        strcpy(message, "BITAP takes 2 strings as arguments");
        return 1;    
    }

    return 0;
}

void bitap_deinit(UDF_INIT *initid)
{
    // TODO: To all delete and free calls here, if required
}

long long bitap(UDF_INIT *initid, UDF_ARGS *args,
              char *is_null, char *error)
{
    int result = -1;
	int m = args->lengths[1]; // pattern length
	int l = args->lengths[0]; // text length
	unsigned long long *R;
	unsigned long long pattern_mask[CHAR_MAX+1];
	int i, d;
	char *pattern = args->args[1];
	char *text = args->args[0]; 

	if (pattern[0] == '\0') return -1;
	if (m > (int)(sizeof(unsigned long long)-1)) m = sizeof(unsigned long long)-1;

	int k = m/5;

	/* Initialize the bit array R */
	R = (unsigned long long *)malloc((k+1) * sizeof(unsigned long long));
	for (i=0; i <= k; ++i)
 		R[i] = 1;

	/* Initialize the pattern bitmasks */
	for (i=0; i <= CHAR_MAX; ++i)
		pattern_mask[i] = 0;
	for (i=0; i < m; ++i)
		pattern_mask[(int)pattern[i]] |= (1ULL << i);

	for (i=0; i < l; ++i) {
	 /* Update the bit arrays */
		unsigned long long old_Rd = 0;
		unsigned long long old_Rd_next = 0;

		for (d=0; d <= k; ++d) {
			unsigned long long Rins = old_Rd | ((R[d] & pattern_mask[(int)text[i]]) << 1);
			unsigned long long Rdel = (old_Rd_next | (R[d] & pattern_mask[(int)text[i]])) << 1;
			unsigned long long Rsub = (old_Rd | (R[d] & pattern_mask[(int)text[i]])) << 1;
			old_Rd = R[d];
			R[d] = Rins | Rdel | Rsub | 1;
			old_Rd_next = R[d];
		}

		if (0 < (R[k] & (1ULL << m))) {
			result = 1;
			break;
		}
	}

	free(R);
	return result;
}