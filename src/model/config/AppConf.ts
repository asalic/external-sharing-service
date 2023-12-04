
export interface SharingMethod {
    email: EmailSharing
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
    maxFileSize: number;
    allowedFileTypes: string;
    storePath: string;
}

export interface PgConnection {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;

}

export interface DbSettings {
    client: string;
    connection: PgConnection;
}

export interface OidcSettings {
    url: string;
    realm: string;
    clientId: string;
    clientSecret: string;
}

export interface AppConf {
    sharing: SharingMethod;
    db: DbSettings;
    path: string;
    port: number;
    oidc: OidcSettings;
}