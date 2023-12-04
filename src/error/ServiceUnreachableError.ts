let BaseError = require("./BaseError.js");

export default class ServiceUnreachableError extends BaseError {

  public static  STATUS_CODE: number = 504;  

  constructor(serviceName: string) {
    super("Service Unreachable",
      "The " + serviceName + " service cannot be reached. Please wait a bit or contact us in case of prolonged downtime.",
      ServiceUnreachableError.STATUS_CODE);
  }

}
