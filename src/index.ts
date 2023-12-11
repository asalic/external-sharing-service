import HttpErrors from 'http-errors';
import BodyParser from 'body-parser';
//import CookieParser from 'cookie-parser';
import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import type { ErrorRequestHandler } from "express";
import morgan from 'morgan';
//import path from "node:path";
//import 'dotenv/config';
//import fs from "node:fs";
import { parseArgs } from 'node:util';

import BaseError from './error/BaseError.js';
import ResultRouter from './route/ResultRouter.js';
import AppConfLoader from './service/AppConfLoader.js';
import { type AppConf } from './model/config/AppConf.js';
import { exit } from 'node:process';
console.log(process.argv);
const { values } = parseArgs({ args: process.argv.slice(2, process.argv.length), options: {
        "settings": { type: "string", short: "s", "default": undefined }
        }
    });
console.log(values.settings);
if (!values.settings) {
    console.error("[ERROR] Please load a settings file using either -s or --settings.");
    exit(1);
}
const settingsPath = values.settings ?? "";
const appConf: AppConf = AppConfLoader.getAppConf(settingsPath);//JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf8', flag: 'r' }));
// /const appConfig = AppConfig.get();

const app: Express = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(express.static(path.join(__dirname, 'public')));
//app.use(CookieParser());
//app.use(BodyParser.json({ limit: appConfig.resultPostSize }));
app.use(BodyParser.urlencoded({ extended: true }));
//app.use(upload.array());

const resultRouter = new ResultRouter(appConf);
app.use(appConf.path, resultRouter.getRouter());
// 404 handler and pass to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
    next(HttpErrors(404, new BaseError("Not found", "Path " + req.path + " not found on the server", 404)));
});

const errorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
 // set locals, only providing error in development
    // res.locals.message = err.message;
    // res.locals.error = req.app.get('env') === 'development' ? err : {};
    //
    // // render the error page
    // res.status(err.status || 500);
    // res.render('error');
    console.log('error');
    //res.error = err;
    res.status(err.status).json(err);
};
app.use(errorHandler);

app.set('trust proxy', appConf.sharing.email.trustProxy ?? false);

console.log(`Running on PORT ${appConf.port}`);

app.listen(appConf.port);