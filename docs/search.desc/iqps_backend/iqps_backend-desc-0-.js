searchState.loadedDescShard("iqps_backend", 0, "Utils for Github OAuth integration and JWT authentication\nDatabase stuff. See submodules also.\nEnvironment Variables\nUtils for parsing paths on the server and to …\nUtils for parsing question paper details\nRouter, <code>handlers</code>, <code>middleware</code>, state, and response utils.\nStruct containing the auth information of a user\nTakes a Github OAuth code and creates a JWT authentication …\nReturns the argument unchanged.\nCalls <code>U::from(self)</code>.\nVerifies whether a JWT is valid and signed with the secret …\nThe database\nEdit’s a paper’s details.\nReturns the argument unchanged.\nReturns all papers that match one or more of the specified …\nFetches the list of all unapproved papers\nInserts a new library question paper into the database. …\nInserts a new uploaded question paper into the database. …\nCalls <code>U::from(self)</code>.\nCreates a new database connection given the environment …\nSearches for papers from a given query. Uses some voodoo …\nSets the <code>is_deleted</code> field to true and <code>approve_status</code> to …\nUpdates filelink for an uploaded question paper uploaded …\nList of origins allowed (as a list of values separated by …\nDatabase hostname\nDatabase name\nDatabase password\nDatabase port\nDatabase username\nReturns the argument unchanged.\nReturns the JWT signing key\nThe usernames of the admins (additional to org team …\nOAuth app client id (public token)\nOAuth app client secret\nAn org admin’s Github token (with the <code>read:org</code> …\nGithub organization name\nGithub organization team slug (this team has access to …\nCalls <code>U::from(self)</code>.\nLocation where logs are stored\nMaximum number of papers that can be uploaded at a time\nAll paths must be handled using this\nProcesses the environment variables after reading.\nThe port the server listens on\nApproved paper\nLibrary paper (scraped using the peqp scraper)\nA category of papers, can also be used to represent the …\nStruct containing all the paths and URLs required to parse …\nUnapproved paper\nReturns the argument unchanged.\nReturns the argument unchanged.\nReturns the absolute system path for the specified …\nReturns the absolute system path from a given slug\nReturns the slug for a given filename and paper category …\nReturns the static server URL for the specified directory …\nReturns the static server URL for a given slug\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.\nCreates a new <code>Paths</code> struct\nRemoves any non-alphanumeric character and replaces …\nThe fields of a question paper sent from the admin …\nAutumn semester, parsed from <code>autumn</code>\nThe fields of a question paper sent from the search …\nClass test, parsed from either <code>ct</code> or <code>ct</code> followed by a …\nEnd-semester examination, parsed from <code>endsem</code>\nRepresents the exam type of the paper.\nThe details for a question paper in the library\nMid-semester examination, parsed from <code>midsem</code>\nRepresents a semester.\nSpring semester, parsed from <code>spring</code>\nUnknown/wildcard semester, parsed from an empty string.\nUnknown class test, parsed from an empty string.\nReturns the argument unchanged.\nReturns the argument unchanged.\nReturns the argument unchanged.\nReturns the argument unchanged.\nReturns the argument unchanged.\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.\nReturns the question paper with the full static files URL …\nThe request format for the paper edit endpoint\nThe details for an uploaded question paper file\nReturns the argument unchanged.\nReturns the argument unchanged.\nReturns the Axum router for IQPS\nCalls <code>U::from(self)</code>.\nCalls <code>U::from(self)</code>.")