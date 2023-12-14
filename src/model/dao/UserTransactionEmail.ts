import UserTransaction from "./UserTransaction.js";


export default class UserTransactionEmail extends UserTransaction {

    toEmail: string;
    fromEmail: string;
    subject?: string | null;
    body?: string | null;

}