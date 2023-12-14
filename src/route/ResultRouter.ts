import express from 'express';

//import fetch from 'node-fetch';

import { type AppConf } from '../model/config/AppConf.js';
import ResultEmail from '../service/ResultEmail.js';


export default class ResultRouter {
  

  protected router: express.Router;
  protected appConf: AppConf;
  protected resultEmail: ResultEmail;

  constructor(appConf: AppConf) {
    this.appConf = appConf;
  }

  public async getRouter(): Promise<express.Router> { 
    if (!this.router) {
      this.router = express.Router();
      this.resultEmail = new ResultEmail(this.appConf);
      await  this.resultEmail.init();
      this.router.post(this.resultEmail.getPath(), this.resultEmail.getMulterHandler(), 
        this.resultEmail.getMulterFileSizeError(), //keycloak.protect(),
        this.resultEmail.handleCall.bind(this.resultEmail)  
      );
    }
    return this.router;
  }



}