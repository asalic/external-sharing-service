import TransactionData from "./TransactionData.js";
import UserTransactionStatus from "./UserTransactionStatus.js";

export default  class  UserTransaction {

    executionDate?: Date | null;
    userId: string;
    transactionData: TransactionData;
    status: UserTransactionStatus;

}