/** A named API deployment. The name is part of every query key, so data never crosses environments. */
export interface ApiEnvironment {
  readonly name: string;
  readonly baseUrl: string;
}

export function defineEnvironment(name: string, baseUrl: string): ApiEnvironment {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid environment name "${name}": use lowercase letters, digits and dashes.`);
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL for environment "${name}".`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Base URL for environment "${name}" must be http(s).`);
  }
  if (url.search || url.hash || url.username || url.password) {
    throw new Error(`Base URL for environment "${name}" must not carry a query, fragment or credentials.`);
  }
  return Object.freeze({ name, baseUrl: url.href.replace(/\/+$/, '') });
}
