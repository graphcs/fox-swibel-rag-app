export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }
}
