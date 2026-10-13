// Google Apps Script web app. It checks the PIN again and writes a file to Drive.
export const DRIVE_URL = 'https://script.google.com/macros/s/AKfycbyu3CYrrun_VM216DBuAduG7MLqbQcdIyZns5Qzp_JZ7bq0Vu3lUfedk5ddDuDSgL6Jxg/exec';

// Salted SHA-256, same idea as the other PIN gates: sha256(salt + pin).
// The digits are not stored in this file. A short PIN is only a light lock.
export const PIN_SALT = 'ck-transcriber-v1';
export const PIN_HASH = '8f2a3364d880e50550e2b73a31fbeb50c595ffffd18f72c0e579048d9d08794c';
