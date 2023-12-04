import { Request, Response as ResponseExpress, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import path from "node:path";
import mime from "mime";

import nodemailer from "nodemailer";

import { AppConf } from "../model/config/AppConf.js";
import ResponseMessage from '../model/ResponseMessage.js';
import SettingsParams from '../model/SettingsParams.js';
import ResultAbstract from "./ResultAbstract.js";


export default class ResultEmail extends ResultAbstract {

    constructor(appConf: AppConf) {
        super(appConf);
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
          cb(null, thisO.appConf.sharing.email.storePath);
        },
        filename: function (req, file, cb) {
          cb(null, file.fieldname + '-' + Date.now())
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
        const authorizationHeader: string | undefined = req.header("Authorization");
        if (authorizationHeader) {
          const oidcResponse: Response = await this.auth(authorizationHeader);
          const status: number = oidcResponse.status;
          if (status === 200) {
            const userInfo: any = {
              id: "test", username: "test", "firstName": "FN", "lastName": "LN", "email": "test@test.com"
            }
            const sp: string | null | undefined = this.appConf.sharing.email.storePath;
              const fp = req.file?.filename ?? "test";
              const ffp = path.join(sp, userInfo.id, fp);
            try {
                const info: nodemailer.SentMessageInfo = await this.sendMail(userInfo.email, [
                  {
                    filename: req.file?.originalname,
                    path: ffp,
                    contentType: mime.getType(fp)
                  }
                ]);
                console.log(info);
                payload = { message: `Uploaded data forwarded to ${userInfo.firstName} ${userInfo.lastName} (${userInfo.username}) email ${userInfo.email}`, statusCode: 200 };
            } catch (e) {
              console.error(e);
              const msg = e instanceof Error ? e.message : JSON.stringify(e); 
              payload = { message: `Error sending the email: ${msg}`, statusCode: 500 };
            }
          } else {
            payload = { message: `Message from the IdP: ${oidcResponse.statusText}`, statusCode: 502 };
          }
        } else {
          payload = { message: "Missing authorization header", statusCode: 401 };
        }
  
      } catch(e) {
        console.error(e);
        payload = { message: "Something went wrong", statusCode: 500 };
      } finally {
        res.status(payload.statusCode);
        res.send(payload);
      }
  
    }


}