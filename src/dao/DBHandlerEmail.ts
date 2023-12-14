import knex from "knex";
import DBHandlerError from "../error/DBHandlerError.js";
//import UserTransaction from "../model/dao/UserTransaction.js";

import DBHandlerAbstract from "./DBHandlerAbstract.js";
import UserTransactionEmail from "../model/dao/UserTransactionEmail.js";

export  default  class DBHandlerEmail  extends DBHandlerAbstract {
    


    // protected addTransactionDataEmail(transaction_data_id: number,
    //     to_email: string, from_email: string, subject?: string | null, body?: string | null ): knex.Knex.QueryBuilder {
    //     if (!this.initted) throw new DBHandlerError(DBHandlerAbstract.ERROR_NOT_INITTED);
    //     return this.knexDb.insert({
    //             transaction_data_id, to_email, from_email, subject, body
    //         })
    //         .into("transaction_data_email");
    // }

    protected addUserTransactionEmailInt(user_transaction_id: number, to_email: string, from_email: string, 
                subject?: string | null, body?: string | null): knex.Knex.QueryBuilder {
            return this.knexDb
                .insert({user_transaction_id, from_email, to_email, subject, body})
                .into("user_transaction_email")
                .returning("id");
        }

    public override async addUserTransaction<DBHandlerEmailReturn>(transaction: UserTransactionEmail): Promise<DBHandlerEmailReturn> {
        if (!this.initted) throw new DBHandlerError(DBHandlerAbstract.ERROR_NOT_INITTED);
        return this.addUserIfMissing(transaction.userId)
            .then(() => {
                return this.addTransactionData(transaction.transactionData.originalName, transaction.transactionData.filename);
            })
            .then((d?: any[] | null) => {
                const transaction_data_id = d?.[0]?.id ?? null;
                //console.log(`Insert transaction  data with ID '${transaction_data_id}'`);
                if (transaction_data_id) {
                    return this.addUserTransactionInt(transaction.userId, transaction_data_id, 
                        transaction.status.id, transaction.executionDate)
                        .then((utId?: any[] | null) => {
                            //console.log(`Insert transaction with ID '${utId}'`);
                            const user_transaction_id = utId?.[0]?.id ?? null;
                            if (user_transaction_id) {
                                return this.addUserTransactionEmailInt(user_transaction_id, transaction.toEmail, 
                                        transaction.fromEmail, transaction.subject, transaction.body)
                                .then(() => user_transaction_id as DBHandlerEmailReturn);
                            } else {
                                throw new DBHandlerError("missing ID from user transaction insertion");
                            }
                        });
                } else {
                    throw new DBHandlerError("missing ID from transaction data insertion");
                }
            });
    }

}