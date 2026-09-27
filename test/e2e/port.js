// One dedicated port for the e2e server. Never reuse a server already listening there: an earlier
// session's server on the shared default port served ANOTHER checkout and the suite tested the wrong code.
export const E2E_PORT = Number(process.env.E2E_PORT || 4191);
