/**
 * Represents a standardized API response.
 * 
 * @class
 * @property {number} statusCode - The HTTP status code of the response.
 * @property {*} data - The payload or data returned by the API.
 * @property {string} message - A descriptive message about the response (default: "Success").
 * @property {boolean} success - Indicates if the response is successful (true if statusCode < 400).
 * 
 * @param {number} statusCode - The HTTP status code to return.
 * @param {*} data - The data to include in the response.
 * @param {string} [message="Success"] - Optional message describing the response.
 */

class ApiResponse {
    constructor(statusCode,data,message = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }

}

export { ApiResponse };
