

export default class DBHandlerError extends Error {

    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }
}