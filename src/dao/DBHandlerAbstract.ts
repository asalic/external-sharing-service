
import knex from "knex";
import DBHandlerError from "../error/DBHandlerError.js";
import MissingValueError from "../error/MissingValueError.js";
import EUserTransactionStatus from "../model/dao/EUserTransactionStatus.js";
import TransactionData from "../model/dao/TransactionData.js";

import UserTransaction from "../model/dao/UserTransaction.js";
import UserTransactionStatus from "../model/dao/UserTransactionStatus.js";

export default abstract class DBHandlerAbstract {

    public static ERROR_NOT_INITTED = "Please init the DB handler before using it.";

    protected knexDb: knex.Knex;
    protected uTStatuses: Map<EUserTransactionStatus, UserTransactionStatus>;
    protected initted: boolean = false;

    constructor(dbConf: any) {
        this.knexDb = knex(
            dbConf
        );
    }

    public async init() {
        this.uTStatuses =  new Map();
        (await this.knexDb<UserTransactionStatus>("transaction_data_status")
            .select("*")
            .from("user_transaction_status"))
            .forEach(e => {
                const t: EUserTransactionStatus = (<any>EUserTransactionStatus)[e.code];
                this.uTStatuses.set(t, e);
            });
        console.log(`Loaded ${this.uTStatuses.size} user transaction statuses from the DB`);
        this.initted = true;
    }

    public getUserTransactionStatus(code: EUserTransactionStatus): UserTransactionStatus {
        const r: UserTransactionStatus | undefined | null =  this.uTStatuses.get(code);
        if (!r) {
            throw new MissingValueError(`User transaction status '${code} not found in the database.`)
        } else {
            return r;
        }
    }

    public getUserTransactionCountToday(userId: string): Promise<number > {
        const dtStartDay: Date = new Date();
        dtStartDay.setUTCHours(0);
        dtStartDay.setUTCMilliseconds(0);
        dtStartDay.setUTCMinutes(0);
        dtStartDay.setUTCSeconds(0);
        //console.debug(`Today base line is: ${dtStartDay.toISOString()}`);
        //console.debug(`Today now date is: ${new Date().toISOString()}`);
        return this.knexDb.select()
            .where("user_id", userId)
            .whereBetween("execution_date", [dtStartDay, new Date()])
            .from("user_transaction")
            .count<number>('id AS cnt')
            .first()
            .then((d: any) => new Promise((res, rej) => {
                const cnt: number  = d?.["cnt"] ?? -1;
                res(cnt);
                // if (d) {
                //     res(await d);
                // } else {
                //     rej(d);
                // }
            }));
    }

    protected addUserIfMissing(keycloak_id: string): knex.Knex.QueryBuilder {
        return this.knexDb("user_info").insert({
            keycloak_id
        })
        .onConflict("keycloak_id")
        .ignore();
    }

    protected addTransactionData(original_name: string, file_name: string): knex.Knex.QueryBuilder {
        return this.knexDb.insert({
                original_name, file_name
            })
            .into("transaction_data")
            .returning("id");
    }

    protected addUserTransactionInt(user_id: string, transaction_data_id: number, 
            user_transaction_status_id: number, execution_date?: Date | null): knex.Knex.QueryBuilder {
        return this.knexDb
            .insert({
                execution_date: execution_date ?? new Date(),
                user_id,
                transaction_data_id,
                user_transaction_status_id,

            })
            .into("user_transaction")
            .returning("id")
    }

    public abstract addUserTransaction<T>(transaction: UserTransaction): Promise<T>;
}