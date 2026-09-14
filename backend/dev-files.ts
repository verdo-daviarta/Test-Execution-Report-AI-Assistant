// Retain Vite's default sensitive-file exclusions and deny local server data.
export const DEV_FILE_DENY = [
  '.env', '.env.*', '*.{crt,pem}', '**/.git/**',
  '**/[dD][aA][tT][aA]/**',
  '**/[bB][aA][cC][kK][eE][nN][dD]/**',
  '**/[sS][cC][rR][iI][pP][tT][sS]/**',
];
