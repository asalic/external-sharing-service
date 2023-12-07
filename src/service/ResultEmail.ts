import type { Request, Response as ResponseExpress, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import path from "node:path";
import mime from "mime";
import uuid from "uuid";
import fs from "node:fs";


import nodemailer from "nodemailer";

import { type AppConf } from "../model/config/AppConf.js";
import type ResponseMessage from '../model/ResponseMessage.js';
import type SettingsParams from '../model/SettingsParams.js';
import ResultAbstract from "./ResultAbstract.js";
import type UserRepresentation from '../model/UserRepresentation.js';
import AuthenticationError from '../error/AuthenticationError.js';


export default class ResultEmail extends ResultAbstract {

    constructor(appConf: AppConf) {
        super(appConf);
        if (!fs.existsSync(appConf.sharing.email.storePath)){
          fs.mkdirSync(appConf.sharing.email.storePath, {recursive: true});
        }
        if (!fs.existsSync(appConf.sharing.email.tmpStorePath)){
          fs.mkdirSync(appConf.sharing.email.tmpStorePath, {recursive: true});
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
            fileSize: this.appConf.sharing.email.maxFileSize
          }
      }
    }

    protected getMulterFileFilter(): Function {
      return async (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
          const s: SettingsParams | null = this.getSettingsParams(req.params["byType"]);
          if (s) {
            // Allowed ext
            const filetypes = new RegExp(`/${s.allowedFileTypes}/`);
            // Check ext
            const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
            // Check mime
            const mimetype = filetypes.test(file.mimetype);
      
            if(mimetype && extname) {
              cb(null, true);
            } else {
              cb(null, false);
            }
          } else {
            cb(null, false);
          }
        }
    }

    protected getMulterStorage(): multer.StorageEngine {
      const thisO = this;
      return multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, thisO.getUploadTmpPath());
        },
        filename: function (req, file, cb) {
          cb(null, uuid.v4())
        }
      })
    }

    public getMulterHandler(): RequestHandler {
      return multer(this.getMulterConf()).single(this.appConf.sharing.email.uploadFieldName);
    }

    protected async sendMail(to: string, 
        attachments: any[]): Promise<nodemailer.SentMessageInfo> {
      const transporter = nodemailer.createTransport({
        host: this.appConf.sharing.email.smtpServer,
        port: this.appConf.sharing.email.smtpPort,
        secure: true
      });
      const info = await transporter.sendMail({
        from: `"${this.appConf.sharing.email.fromName}" <${this.appConf.sharing.email.fromAddress}>`, // sender address
        to, // list of receivers
        subject: this.appConf.sharing.email.subject, // Subject line
        text: this.appConf.sharing.email.text,
        attachments
      });
      return info;
    }


    public async handleCall(req: Request, res: ResponseExpress, next: NextFunction): Promise<void> {
      let payload: ResponseMessage = {
        message: "Not implemented", 
        statusCode: 501
      };
      try {
        const ur: UserRepresentation = await this.auth(req);
        const tokenValid: boolean = this.validateApiToken(req,  ur);
        if (tokenValid) {
          const sp: string = this.appConf.sharing.email.storePath;
            const fp = req.file?.originalname ?? uuid.v4();
            const ffp = path.join(sp, ur.id, fp);
            const tmpFfp: string = path.join(this.getUploadTmpPath(), req.file?.filename ?? "");
            this.moveUploadedFromTmp(tmpFfp, ffp);
          try {
              const info: nodemailer.SentMessageInfo = await this.sendMail(ur.email, [
                {
                  filename: req.file?.originalname,
                  path: ffp,
                  contentType: mime.getType(fp)
                }
              ]);
              console.log(info);
              payload = { message: `Uploaded data forwarded to ${ur.firstName} ${ur.lastName} (${ur.username}) email ${ur.email}`, statusCode: 200 };
          } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : JSON.stringify(e); 
            payload = { message: `Error sending the email: ${msg}`, statusCode: 500 };
          }
        } else {
          payload = { message: "Invalid API token", statusCode: 401 };
        }
      } catch(e) {
        if (e instanceof AuthenticationError) {
          payload = { message: `${e.getTitle()}: ${e.getMessage}`, statusCode: e.getStatus() };
        } else {
          console.error(e);
          payload = { message: "Something went wrong", statusCode: 500 };
        }
      } finally {
        res.status(payload.statusCode);
        res.send(payload);
      }
  
    }

    protected moveUploadedFromTmp(source: string, destination: string): void {
      fs.cpSync(source,  destination);
      fs.rmSync(source);
    }


}