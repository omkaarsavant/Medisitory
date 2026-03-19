// === backend/src/errors/requestValidationError.ts ===

export class RequestValidationError extends Error {
  public errorCode: string
  
  constructor(message: string, errorCode: string) {
    super(message)
    this.name = 'RequestValidationError'
    this.errorCode = errorCode
    Object.setPrototypeOf(this, RequestValidationError.prototype)
  }
}
