import type { Request, Response as ResponseExpress, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import path from "node:path";
import mime from "mime";
import {v4 as uuidv4} from "uuid";
import fs from "node:fs";
import nodemailer from "nodemailer";

import { type AppConf } from "../model/config/AppConf.js";
import type ResponseMessage from '../model/ResponseMessage.js';
// /import type SettingsParams from '../model/SettingsParams.js';
import ResultAbstract from "./ResultAbstract.js";
import type UserRepresentation from '../model/UserRepresentation.js';
import AuthenticationError from '../error/AuthenticationError.js';
import type KeycloakApiToken from '../model/KeycloakApiToken.js';
import DBHandlerEmail from '../dao/DBHandlerEmail.js';
import UserTransactionEmail from '../model/dao/UserTransactionEmail.js';
import EUserTransactionStatus from '../model/dao/EUserTransactionStatus.js';

export default class ResultEmail extends ResultAbstract {

    constructor(appConf: AppConf) {
        super(appConf);
        this.dbHandler = new DBHandlerEmail(appConf.db);
        this.path = "/result/email";
    }    

    public async init(): Promise<void> {
      await this.dbHandler.init();
      if (!fs.existsSync(this.appConf.sharing.email.storePath)){
        fs.mkdirSync(this.appConf.sharing.email.storePath, {recursive: true});
      }
      if (!fs.existsSync(this.appConf.sharing.email.tmpStorePath)){
        fs.mkdirSync(this.appConf.sharing.email.tmpStorePath, {recursive: true});
      }
    }

    protected getUploadTmpPath(): string  {
      return this.appConf.sharing.email.tmpStorePath;
    }
    
    protected getMulterConf(): any {
        return {
          storage: this.getMulterStorage(),
          fileFilter: this.getMulterFileFilter(),
          limits: {
            fileSize: this.appConf.sharing.email.file.maxSize
          }
      }
    }

    protected getMulterFileFilter(): Function {
      return async (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const re = new RegExp(this.getFileNameRegex());
        if (!re.test(file.originalname)) {
          const e = new Error(
            `File name contains invalid characters. Please use the following regex expression to validate the name: ${this.getFileNameRegex()}`,
            //400
            );
          cb(e);
          //return  { message: `File name contains invalid characters. Please use the following regex expression to validate the name: ${this.getFileNameRegex()}`, statusCode: 400 };
        }
        if (file.originalname.length > this.getFileNameMaxLen()) {
          const e = new Error(
            `File name's length should be less than ${this.getFileNameMaxLen()} characters total, including extension`,
            //400
            );
          cb(e);
          //return  { message: `File name's length should be less than ${this.getFileNameMaxLen()} characters total, including extension`, statusCode: 400 };
        }
        cb(null, true);
          // const s: SettingsParams | null = this.getSettingsParams(this.getPath());
          // if (s) {
          //   // Allowed ext
          //   const filetypes = new RegExp(`/${s.allowedFileTypes}/`);
          //   // Check ext
          //   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
          //   // Check mime
          //   const mimetype = filetypes.test(file.mimetype);
          //   console.log(path.extname(file.originalname).toLowerCase());
          //   console.log(path.extname(file.mimetype));
          //   if(mimetype && extname) {
          //     cb(null, true);
          //   } else {
          //     cb(null, false);
          //   }
          // } else {
          //   cb(null, false);
          // }
        }
    }

    protected getMulterStorage(): multer.StorageEngine {
      const thisO = this;
      return multer.diskStorage({
        destination: function (req, file, cb) {
          console.log(thisO.getUploadTmpPath());
          cb(null, thisO.getUploadTmpPath());
        },
        filename: function (req, file, cb) {
          cb(null, uuidv4())
        }
      })
    }

    public getMulterHandler(): RequestHandler {
      return multer(this.getMulterConf()).single(this.appConf.sharing.email.uploadFieldName);
    }

    protected sendMail(to: string, 
        attachments: any[]): Promise<nodemailer.SentMessageInfo> {
      const transporter = nodemailer.createTransport({
        host: this.appConf.sharing.email.smtpServer,
        port: this.appConf.sharing.email.smtpPort,
        secure: false,
        tls: {
            ciphers:'SSLv3'
        }
      });
      return  transporter.sendMail({
        from: `"${this.appConf.sharing.email.fromName}" <${this.appConf.sharing.email.fromAddress}>`, // sender address
        to, // list of receivers
        subject: this.appConf.sharing.email.subject, // Subject line
        text: this.appConf.sharing.email.text,
        attachments
      });
    }


    protected getFileNameRegex(): string { return this.appConf.sharing.email.file.nameRegex; }
    protected getFileNameMaxLen(): number { return this.appConf.sharing.email.file.nameMaxLen; }
    protected getFileSizeMax(): number { return this.appConf.sharing.email.file.maxSize; }


    public async handleCall(req: Request, res: ResponseExpress, next: NextFunction): Promise<void> {
      let payload: ResponseMessage = {
        message: "Not implemented", 
        statusCode: 501
      };
      console
      const tmpFfp: string | null = req.file && req.file.filename 
        ? path.join(this.getUploadTmpPath(), req.file.filename)
        : null;
      try {
        const ur: UserRepresentation = await this.auth(req);
        const kapReq: KeycloakApiToken  | null = this.validateApiToken(req,  ur);
        if (kapReq) {
          const submitCount: number = await this.dbHandler.getUserTransactionCountToday(kapReq.userId);
          if (submitCount < this.appConf.sharing.email.maxNumUploadsDaily) {
            const sp: string = this.appConf.sharing.email.storePath;
            const validateResp: ResponseMessage = this.validateFile(req.file);
            if (validateResp.statusCode === 201 && req.file && tmpFfp) {
              const fp = req.file.filename;
              try {
                  const info: nodemailer.SentMessageInfo = await this.sendMail(ur.email, [
                    {
                      filename: fp,
                      path: tmpFfp,
                      contentType: mime.getType(fp)
                    }
                  ]);
                  console.error(info);
                  if (info && info?.["accepted"] && info?.["accepted"].length > 0 
                      && info?.["accepted"][0].toLowerCase() === ur.email.toLowerCase()) {
                      const ffp = path.join(sp, ur.id, fp);
                      if (!fs.existsSync(path.dirname(ffp))){
                        fs.mkdirSync(path.dirname(ffp), {recursive: true});
                      }
                      fs.renameSync(tmpFfp, ffp);
                      const t: UserTransactionEmail = {
                          userId: kapReq.userId,
                          toEmail: ur.email,
                          fromEmail: this.appConf.sharing.email.fromAddress,
                          subject: this.appConf.sharing.email.subject,
                          body: this.appConf.sharing.email.text,
                          transactionData: {
                            originalName: fp,
                            filename: req.file.filename
          
                          },
                          status: this.dbHandler.getUserTransactionStatus(EUserTransactionStatus.STORE_SUC) 
                        }
                      const tId: number = await this.dbHandler.addUserTransaction(t);
                      console.log(`Transaction with ID ${tId} created`);
                      payload = { message: `Uploaded data forwarded to ${ur.firstName} ${ur.lastName} (${ur.username}) email ${ur.email}`, statusCode: 200 };
                  } else if (info && info?.["response"]) {
                    payload = { message: `Unable to send the email: ${info.response}`, statusCode: 401 }
                  } else {
                    console.error(info);
                    payload = { message: `Unable to send the email, error unknown`, statusCode: 401 }
                  }
                } catch (e) {
                console.error(e);
                const msg = e instanceof Error ? e.message : JSON.stringify(e); 
                payload = { message: `Error sending the email: ${msg}`, statusCode: 500 };
              }
            } else {
              payload = validateResp;
            }
          } else {
            payload = { message: `You have reached the limit of the max number of emails you are allowed to send daily (${this.appConf.sharing.email.maxNumUploadsDaily}). Please wait until the limit is reset the next day at 00:00:00 UTC time`,
              statusCode: 406 }
          }
        } else {
          payload = { message: "Invalid API token", statusCode: 401 };
        }
      } catch(e) {
        if (e instanceof AuthenticationError) {
          payload = { message: `${e.getTitle()}: ${e.getMessage()}`, statusCode: 401 };
        } else {
          console.error(e);
          payload = { message: "Something went wrong", statusCode: 500 };
        }
      } finally {
        //clean tmp files if still there
        if (tmpFfp && fs.existsSync(tmpFfp)) {
          console.log(`Removing file ${tmpFfp}`);
          fs.rmSync(tmpFfp);
        }
        res.status(payload.statusCode ?? 500);
        res.send(payload);
      }
  
    }

}