/**
 * Represents the problem details body the API returns for every error. Validation failures carry one message per
 * field under errors.
 */
export interface ApiProblemDetail {
  statusCode: number;
  title: string;
  detail: string;
  errors?: Record<string, string>;
}
