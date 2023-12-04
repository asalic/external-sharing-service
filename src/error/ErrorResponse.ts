
export default class ErrorResponse {

    static from(error: string, status_code: number) {
        return {
            error, status_code: status_code.toString()
        };
    }
}