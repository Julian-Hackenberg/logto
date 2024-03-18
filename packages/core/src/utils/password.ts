import crypto from 'node:crypto';

import { UsersPasswordAlgorithm } from '@logto/schemas';
import { argon2i } from 'hash-wasm';

import RequestError from '#src/errors/RequestError/index.js';
import assertThat from '#src/utils/assert-that.js';

export const encryptPassword = async (
  password: string,
  method: UsersPasswordAlgorithm
): Promise<string> => {
  assertThat(
    method === UsersPasswordAlgorithm.Argon2i,
    new RequestError({ code: 'password.unsupported_encryption_method', method })
  );

  return argon2i({
    password,
    salt: crypto.randomBytes(16),
    iterations: 256,
    parallelism: 1,
    memorySize: 4096,
    hashLength: 32,
    outputType: 'encoded',
  });
};
