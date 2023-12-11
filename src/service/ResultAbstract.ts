import type  { Express, Request, RequestHandler, Response as ResponseExpress, NextFunction } from 'express';
import multer from 'multer';
import AuthenticationError from '../error/AuthenticationError.js';
//import path from "node:path";

import { type AppConf } from '../model/config/AppConf.js';
import type KeycloakApiToken from '../model/KeycloakApiToken.js';
import type ResponseMessage from '../model/ResponseMessage.js';
import type SettingsParams from '../model/SettingsParams.js';
import type UserRepresentation from '../model/UserRepresentation.js';
//import ErrorResponse from "../error/ErrorResponse.js";
//import ResponseMessage from '../model/ResponseMessage.js';

export default abstract class ResultAbstract {

    protected appConf: AppConf;
    protected path: string;

    constructor(appConf: AppConf) {
        this.appConf = appConf;
    }

    public abstract getMulterHandler(): RequestHandler;
    protected abstract getMulterStorage(): multer.StorageEngine;
    protected abstract getMulterFileFilter(): Function;
    protected abstract getMulterConf(): any;    
    public abstract handleCall(req: Request, res: ResponseExpress, next: NextFunction): Promise<void>;
    
    public getPath(): string {return this.path;}

    protected getSettingsParams(byType: string | undefined | null): SettingsParams | null  {
        if (byType) {
          const t: string = byType.toLowerCase();
          switch (t) {
            case "/result/email": 
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

    protected async auth(req: Request): Promise<UserRepresentation> {
      const reqKap: KeycloakApiToken | null = this.parseReqUserRepresentation(req);
      if (reqKap) {
        const headers: HeadersInit = new Headers();
        //headers.set('client_id', this.appConf.oidc.clientId);
        //headers.set('client_secret', this.appConf.oidc.clientSecret);
        //headers.set('grant_type', "client_credentials");
        headers.set("Content-Type",  "application/x-www-form-urlencoded");
        //headers.set('request_uri', "http://localhost:5000");
        console.log("Obtain application token");
        const body = new URLSearchParams({
          'client_id': this.appConf.oidc.clientId,
          'client_secret': this.appConf.oidc.clientSecret,
          'grant_type': "client_credentials"});

        const authR: Response = await fetch(
              this.appConf.oidc.url + "/realms/" + this.appConf.oidc.realm + "/protocol/openid-connect/token",
              {
                method: "POST",
                headers,
                body
              }
            );
        if (authR.status === 200) {
          const authRJson: {[k: string]: any} = await authR.json();
          if (authRJson["access_token"]) {
            console.log("Obtain user information for " + reqKap.userId);
            const headers: HeadersInit = new Headers();
            headers.set("Authorization",  `Bearer ${authRJson["access_token"]}`);
            const getUserCredentialsR: Response = await fetch(
              this.appConf.oidc.url + "/admin/realms/" + this.appConf.oidc.realm + "/users/" + reqKap.userId,
              {
                method: "GET",
                headers
              }
            );
            if (getUserCredentialsR.status === 200) {
              const ur: UserRepresentation = this.userRepresentationKeycloak(await getUserCredentialsR.json());
              return ur;
            } else {
              throw new AuthenticationError("Unable to retrieve user information", await getUserCredentialsR.text(), getUserCredentialsR.status);
            }          
          } else {
            throw new AuthenticationError("Token missing", "The system was unable to obtain a user token", 500);
          }        
        } else {
          console.error(authR);
          throw new AuthenticationError(authR.statusText, await authR.text(), authR.status);
        }
      } else {
        throw new AuthenticationError("Token format invalid", "", 401);
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
      if (resp["attributes"]?.["external_sharing_service_api_token"]) { 
        result["apiToken"] = JSON.parse(atob(resp["attributes"]?.["external_sharing_service_api_token"])) as KeycloakApiToken; 
      } else throw new AuthenticationError("Missing field", "Missing attribute 'external_sharing_service_api_token' from Keycloak authentication response", 500);
      result["firstName"] = resp["firstName"] ?? "";
      result["lastName"] = resp["lastName"] ?? "";
      return result as UserRepresentation;
    }

  protected validateApiToken(req:  Request,  ur: UserRepresentation): boolean {
    const kapReq: KeycloakApiToken | null = this.parseReqUserRepresentation(req);
    if (kapReq && kapReq.secret === ur.apiToken.secret) {
      return true;
    } else {
      return false;
    }
  }

  protected parseReqUserRepresentation(req: Request): KeycloakApiToken | null {
    const token: string | null | undefined = req.headers?.["authorization"]
    if (token) {
      const parts: string[] = token.split(" ");
      if (parts.length === 2 && parts[1] && parts[1].length > 0) {
        return JSON.parse(atob(parts[1])) as KeycloakApiToken;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  protected validateFile(file: Express.Multer.File | null | undefined): ResponseMessage {
    if (!file) {
      return  { message: `Unable to get the file, please be sure you send it with content type 'application/form-data' and the field name for the file called '${this.appConf.sharing.email.uploadFieldName}'`, statusCode: 400 };
    }


    return { message: "", statusCode: 201 };
  }

  protected abstract getUploadTmpPath(): string;

    
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