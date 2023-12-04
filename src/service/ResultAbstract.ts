import { Request, RequestHandler, Response as ResponseExpress, NextFunction } from 'express';
import multer from 'multer';
import AuthenticationError from '../error/AuthenticationError.js';
//import path from "node:path";

import { AppConf } from '../model/config/AppConf.js';
import SettingsParams from '../model/SettingsParams.js';
import UserRepresentation from '../model/UserRepresentation.js';
//import ErrorResponse from "../error/ErrorResponse.js";
//import ResponseMessage from '../model/ResponseMessage.js';

export default abstract class ResultAbstract {

    protected appConf: AppConf;

    constructor(appConf: AppConf) {
        this.appConf = appConf;
    }




    public abstract getMulterHandler(): RequestHandler;
    protected abstract getMulterStorage(): multer.StorageEngine;
    protected abstract getMulterFileFilter(): Function;
    protected abstract getMulterConf(): any;
    public abstract handleCall(req: Request, res: ResponseExpress, next: NextFunction): Promise<void>;


    protected getSettingsParams(byType: string | undefined | null): SettingsParams | null  {
        if (byType) {
          const t: string = byType.toLowerCase();
          switch (t) {
            case "email": 
              return {
                maxFileSize: this.appConf.sharing.email.maxFileSize ?? 0,
                allowedFileTypes: this.appConf.sharing.email.allowedFileTypes ?? ""
              }
            default: {
              console.error(`Unknwon result forwarding method '${t}'`);
              return null;
            }
          }
        } else {
          console.error("Result forwarding method has to be defined");
          return null;
        }
      }

    protected async auth(req: Request): Promise<UserRepresentation | null> {
      const headers: HeadersInit = new Headers();
      headers.set('client_id', this.appConf.oidc.clientId);
      headers.set('client_secret', this.appConf.oidc.clientSecret);
      headers.set('grant_type', "client_credentials");
      const authR: Response = await fetch(
            this.appConf.oidc.url + "realms/" + this.appConf.oidc.realm + "/protocol/openid-connect/token",
            {
              method: "GET",
              headers
            }
          );
      if (authR.status === 200) {
        const authRJson: {[k: string]: any} = authR.json();
        if (authRJson["access_token"]) {
          const getUserCredentialsR: Response = await fetch(
            this.appConf.oidc.url + "realms/" + this.appConf.oidc.realm + "/protocol/openid-connect/token",
            {
              method: "GET",
              headers
            }
          );
          if (getUserCredentialsR.status === 200) {
            const ur: UserRepresentation = this.userRepresentationKeycloak(getUserCredentialsR.json());
            return ur;
          } else {
            return null;
          }          
        } else {
          return null;
        }        
      } else {
        return null;
      }
    }

    protected userRepresentationKeycloak(resp: any): UserRepresentation {
      const result: {[k: string]: any} = Object.create(null);
      //const resp: any = JSON.parse(json);
      if (resp["id"]) { result["id"] = resp["id"]; }
      else throw new AuthenticationError("Missing field", "Missing field 'id' from Keycloak authentication response", 500);
      if (resp["username"]) { result["username"] = resp["username"]; }
      else throw new AuthenticationError("Missing field", "Missing field 'username' from Keycloak authentication response", 500);
      if (resp["enabled"]) { result["enabled"] = Boolean(resp["enabled"]); }
      else throw new AuthenticationError("Missing field", "Missing field 'enabled' from Keycloak authentication response", 500);
      if (resp["email"]) { result["email"] = resp["email"]; }
      else throw new AuthenticationError("Missing field", "Missing field 'email' from Keycloak authentication response", 500);
      if (resp["attributes"]?.["external_sharing_service_api_token"]) { result["apiToken"] = resp["attributes"]?.["external_sharing_service_api_token"]; }
      else throw new AuthenticationError("Missing field", "Missing attribute 'external_sharing_service_api_token' from Keycloak authentication response", 500);
      result["firstName"] = resp["firstName"] ?? "";
      result["lastName"] = resp["lastName"] ?? "";
      return result as UserRepresentation;
    }

    
//   protected auth(authorizationHeader: string): Promise<Response> {
//     //console.log(req);
//     const headers: HeadersInit = new Headers();
//     headers.set('authorization', authorizationHeader);
//    return fetch(
//     this.appConf.oidc.url + "realms/" + this.appConf.oidc.realm + "/protocol/openid-connect/userinfo",
//     {
//       method: "GET",
//       headers
//     }
//   );
// }

}