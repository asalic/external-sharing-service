import express from 'express';
import knex, {Knex} from "knex";

//import fetch from 'node-fetch';

import { type AppConf } from '../model/config/AppConf.js';
import ResultEmail from '../service/ResultEmail.js';


export default class ResultRouter {
  

  protected router: express.Router;
  protected appConf: AppConf;
  protected knexDb: Knex;
  protected resultEmail: ResultEmail;

  constructor(appConf: AppConf) {
    this.appConf = appConf;
    this.knexDb = knex(
      {...appConf.db}
    )
    this.router = express.Router();
      this.resultEmail = new ResultEmail(appConf);
    this.router.post('/result/email', this.resultEmail.getMulterHandler(), //keycloak.protect(),
      this.resultEmail.handleCall.bind(this.resultEmail)  
    );
  }

  public getRouter(): express.Router { return this.router;}



}