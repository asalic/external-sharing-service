

export default  class MissingValueError extends Error {

    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }


}