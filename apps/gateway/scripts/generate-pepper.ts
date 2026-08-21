import { consola } from 'consola';
import { randomBytes } from 'node:crypto';

const PEPPER_BYTE_LENGTH = 32;

const pepper = randomBytes(PEPPER_BYTE_LENGTH).toString('base64url');

consola.info(`API_KEY_PEPPER=${pepper}`);
