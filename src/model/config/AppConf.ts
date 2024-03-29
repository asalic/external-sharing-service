import knex from "knex"; 

export interface SharingMethod {
    email: EmailSharing
}

export interface EmailFileProps {
    nameRegex: string;
    nameMaxLen: number;
    allowedTypes: string;
    maxSize: number;
}

export interface EmailSharing {
    enabled: boolean;
    uploadFieldName: string;
    subject: string;
    fromName: string;
    text: string;
    fromAddress: string;
    smtpServer: string;
    smtpPort: number;
    trustProxy: boolean;
    file: EmailFileProps;
    storePath: string;
    tmpStorePath: string;
    maxNumUploadsDaily: number;
}

export interface OidcSettings {
    url: string;
    realm: string;
    clientId: string;
    clientSecret: string;
}

export interface AppConf {
    sharing: SharingMethod;
    db: knex.Knex.Config<any>;
    path: string;
    port: number;
    oidc: OidcSettings;
}